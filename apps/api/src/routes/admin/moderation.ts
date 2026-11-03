import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";
import { sendTemplatedEmail } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/moderation - Query all pending matrimonial reports
app.get("/", requireAdmin, async (c) => {
  try {
    const db = c.env.DB;

    const reportRows = await db
      .prepare(
        `SELECT r.*,
               u1.email as reporter_email,
               u2.email as reported_email, u2.status as reported_status, u2.strikes as reported_strikes
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_id = u2.id
         WHERE r.status = 'open'
         ORDER BY r.created_at DESC`
      )
      .all<any>();

    return c.json({ success: true, reports: reportRows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/moderation - Moderate: strike user, suspend user, or dismiss report
app.post("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { action, userId, reportId, reason } = await c.req.json();

    if (!action) {
      return c.json({ error: "action parameter is required" }, 400);
    }

    const db = c.env.DB;

    // Action 1: Dismiss Report
    if (action === "dismiss") {
      if (!reportId) return c.json({ error: "reportId required" }, 400);

      await db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").bind(reportId).run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'DISMISS_REPORT', 'report', ?, ?)`
        )
        .bind(admin.id, reportId.toString(), JSON.stringify({ action: "Report dismissed by admin", reason }))
        .run();

      return c.json({ success: true, message: "Report successfully dismissed from moderation queue." });
    }

    if (!userId) {
      return c.json({ error: "userId is required for this action" }, 400);
    }

    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<any>();

    if (!user) {
      return c.json({ error: "Target candidate user not found" }, 404);
    }

    // Action 2: Record Strike / Warning
    if (action === "strike") {
      const newStrikes = (user.strikes || 0) + 1;
      let newStatus = user.status;
      let wasBanned = false;

      if (newStrikes >= 3) {
        newStatus = "suspended";
        wasBanned = true;
      }

      await db.prepare("UPDATE users SET strikes = ?, status = ? WHERE id = ?").bind(newStrikes, newStatus, userId).run();

      const strikeBody = wasBanned
        ? `Your account was suspended due to accumulating ${newStrikes} strikes. Strike reason: ${reason || "Policy breach"}`
        : `Your profile has received a formal strike warning (${newStrikes}/3). Accumulated warnings will result in immediate suspension.`;

      await db
        .prepare(
          `INSERT INTO notifications (user_id, type, title, body)
           VALUES (?, 'system', 'Moderation Strike warning ⚠️', ?)`
        )
        .bind(userId, strikeBody)
        .run();

      if (wasBanned && user.email) {
        sendTemplatedEmail(c.env, user.email, "account_suspended", {
          name: "CA Candidate",
          reason: `Accumulated 3 safety warnings/strikes. Final warning description: ${reason || "Violation of matchmaking behavior guidelines."}`,
        }).catch(console.error);
      }

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'STRIKE_USER', 'user', ?, ?)`
        )
        .bind(admin.id, userId, JSON.stringify({ action: "Strike allocated to user", strikeCount: newStrikes, wasBanned, reason: reason || "Standard warning" }))
        .run();

      if (reportId) {
        await db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").bind(reportId).run();
      }

      return c.json({
        success: true,
        message: wasBanned
          ? "Strike applied successfully. Candidate accumulated 3 strikes and is auto-suspended."
          : `Strike warning recorded successfully (${newStrikes}/3).`,
      });
    }

    // Action 3: Suspend Profile Directly
    if (action === "suspend") {
      await db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").bind(userId).run();

      await db
        .prepare(
          `INSERT INTO notifications (user_id, type, title, body)
           VALUES (?, 'system', 'Account Suspended 🚫', ?)`
        )
        .bind(userId, `Your profile card is temporarily disabled by admin. Reason: ${reason || "Investigation under progress."}`)
        .run();

      if (user.email) {
        sendTemplatedEmail(c.env, user.email, "account_suspended", {
          name: "CA Candidate",
          reason: reason || "Direct administrative moderation suspension.",
        }).catch(console.error);
      }

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'SUSPEND_USER', 'user', ?, ?)`
        )
        .bind(admin.id, userId, JSON.stringify({ action: "Admin Suspended Account Directly", reason: reason || "Investigation under progress" }))
        .run();

      if (reportId) {
        await db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").bind(reportId).run();
      }

      return c.json({ success: true, message: "Candidate profile successfully suspended and emails dispatched." });
    }

    // Action 4: Unsuspend / Activate Profile
    if (action === "unsuspend") {
      await db.prepare("UPDATE users SET status = 'active', strikes = 0 WHERE id = ?").bind(userId).run();

      await db
        .prepare(
          `INSERT INTO notifications (user_id, type, title, body)
           VALUES (?, 'system', 'Account Re-Activated! 🌟', 'Welcome back! Your matrimonial candidate status has been restored successfully.')`
        )
        .bind(userId)
        .run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'UNSUSPEND_USER', 'user', ?, ?)`
        )
        .bind(admin.id, userId, JSON.stringify({ action: "Admin Unsuspended Profile", reason: "Good behavior restoration" }))
        .run();

      return c.json({ success: true, message: "Candidate account successfully re-activated and strikes reset." });
    }

    return c.json({ error: "Invalid action specified." }, 400);
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requirePermission } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/mediation - List all global family mediation requests
app.get("/", requirePermission("mediation"), async (c) => {
  try {
    const db = c.env.DB;

    const rows = await db
      .prepare(
        `SELECT m.*,
               u1.email as requester_email, p1.profile_created_by as requester_name,
               u2.email as target_email, p2.profile_created_by as target_name
         FROM mediation_requests m
         LEFT JOIN users u1 ON m.requester_id = u1.id
         LEFT JOIN profiles p1 ON m.requester_id = p1.user_id
         LEFT JOIN users u2 ON m.target_user_id = u2.id
         LEFT JOIN profiles p2 ON m.target_user_id = p2.user_id
         ORDER BY m.created_at DESC`
      )
      .all<any>();

    return c.json({ success: true, mediationRequests: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/mediation - Manage status of a mediation request
app.post("/", requirePermission("mediation"), async (c) => {
  const admin = c.get("user")!;

  try {
    const { requestId, status, adminNotes, scheduledDate } = await c.req.json();

    if (!requestId || !status) {
      return c.json({ error: "requestId and status are required" }, 400);
    }

    // UI uses pending | scheduled | completed | cancelled (TEXT column; schema comment is outdated)
    const allowed = new Set(["pending", "scheduled", "approved", "completed", "cancelled"]);
    if (!allowed.has(status)) {
      return c.json({ error: `Invalid status. Allowed: ${[...allowed].join(", ")}` }, 400);
    }

    const db = c.env.DB;

    const request = await db
      .prepare("SELECT * FROM mediation_requests WHERE id = ?")
      .bind(requestId)
      .first<any>();

    if (!request) {
      return c.json({ error: "Mediation request not found" }, 404);
    }

    const preferredDate =
      typeof scheduledDate === "string" && scheduledDate.trim()
        ? scheduledDate.trim()
        : request.preferred_date;

    // Write admin_notes only — never overwrite member-authored `notes`
    const nextAdminNotes =
      typeof adminNotes === "string" ? adminNotes.trim() || null : request.admin_notes ?? null;

    await db
      .prepare(
        "UPDATE mediation_requests SET status = ?, admin_notes = ?, preferred_date = COALESCE(?, preferred_date) WHERE id = ?"
      )
      .bind(status, nextAdminNotes, preferredDate, requestId)
      .run();

    const statusTitle =
      status === "scheduled" || status === "approved"
        ? "Mediation Scheduled! 🗓️"
        : status === "completed"
          ? "Mediation Completed! 🎉"
          : "Mediation Update";
    const statusBody =
      status === "scheduled" || status === "approved"
        ? `Your requested family matchmaking meeting has been scheduled${preferredDate ? ` for ${preferredDate}` : ""}. Notes: ${adminNotes || "Facilitator assigned."}`
        : status === "completed"
          ? `Your scheduled family matchmaking meeting has been successfully completed. Best wishes!`
          : `Your mediation request status is now: ${status}.`;

    await db
      .prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system', ?, ?)")
      .bind(request.requester_id, statusTitle, statusBody)
      .run();

    await db
      .prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system', ?, ?)")
      .bind(request.target_user_id, statusTitle, statusBody)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'MEDIATION_UPDATE', 'mediation', ?, ?)`
      )
      .bind(
        admin.id,
        requestId.toString(),
        JSON.stringify({
          action: "Updated mediation status",
          status,
          scheduledDate: preferredDate,
          requesterId: request.requester_id,
          targetUserId: request.target_user_id,
          notes: adminNotes,
        })
      )
      .run();

    return c.json({ success: true, message: `Family mediation request set to ${status} successfully.` });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

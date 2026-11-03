import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";
import { logAdminAudit } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/subscriptions - List all active/expired subscriptions
app.get("/", requireAdmin, async (c) => {
  try {
    const db = c.env.DB;

    const rows = await db
      .prepare(
        `SELECT us.*, pk.name as plan_name, pk.price as plan_price, pk.contact_limit,
               p.gender, p.highest_degree, p.occupation, u.email as user_email
         FROM user_subscriptions us
         LEFT JOIN packages pk ON us.package_id = pk.id
         LEFT JOIN profiles p ON us.user_id = p.user_id
         LEFT JOIN users u ON us.user_id = u.id
         ORDER BY us.created_at DESC`
      )
      .all();

    return c.json({ success: true, subscriptions: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/subscriptions - Admin manually assign package plan to a candidate user
app.post("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { userId, packageId, validityDays, proofUrl, adminNotes, startDate } = await c.req.json();

    if (!userId || !packageId) {
      return c.json({ error: "Missing required fields: userId, packageId" }, 400);
    }

    if (!proofUrl || !String(proofUrl).trim()) {
      return c.json({ error: "Payment proof is required for manual plan activation." }, 400);
    }

    const db = c.env.DB;

    const pkg = await db
      .prepare("SELECT * FROM packages WHERE id = ?")
      .bind(Number(packageId))
      .first<{ id: number; name: string; validity_days: number; contact_limit: number; price: number }>();

    if (!pkg) {
      return c.json({ error: "Selected plan package not found" }, 404);
    }

    const userRow = await db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!userRow) {
      return c.json({ error: "Target candidate user not found" }, 404);
    }

    const days = validityDays ? Number(validityDays) : pkg.validity_days;
    if (!days || days < 1 || !Number.isFinite(days)) {
      return c.json({ error: "Plan period must be at least 1 day." }, 400);
    }

    let start: Date;
    if (startDate && String(startDate).trim()) {
      const datePart = String(startDate).trim().slice(0, 10);
      start = new Date(`${datePart}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        return c.json({ error: "Invalid plan start date." }, 400);
      }
    } else {
      start = new Date();
    }

    const startDateIso = start.toISOString();
    const endDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    // Synthetic payment row so user_subscriptions.payment_id FK (→ payments.id) stays valid.
    const offlinePaymentId = `offline_admin_${String(userId).slice(0, 8)}_${Date.now()}`;
    const offlineOrderId = `offline_order_${Date.now()}`;
    const amountPaise = Math.round(Number(pkg.price || 0) * 100);
    await db
      .prepare(
        `INSERT INTO payments (id, user_id, package_id, amount, status, order_id, payment_method, proof_url, admin_notes, verified_by, verified_at)
         VALUES (?, ?, ?, ?, 'captured', ?, 'offline_admin', ?, ?, ?, ?)`
      )
      .bind(
        offlinePaymentId,
        userId,
        pkg.id,
        amountPaise,
        offlineOrderId,
        String(proofUrl).trim(),
        adminNotes ? String(adminNotes).trim() : null,
        admin.id,
        startDateIso
      )
      .run();

    await db
      .prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
      .bind(userId)
      .run();

    await db
      .prepare(
        `INSERT INTO user_subscriptions (user_id, package_id, start_date, end_date, status, payment_id, contact_limit_balance)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(userId, pkg.id, startDateIso, endDate, offlinePaymentId, pkg.contact_limit || 0)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'payment', 'Subscription Plan Activated! 🌟', ?, ?)`
      )
      .bind(userId, `An administrator has manually assigned you the ${pkg.name} package. Enjoy your premium benefits!`, pkg.id.toString())
      .run();

    await logAdminAudit(db, admin, {
      action_type: "PLAN_ASSIGN",
      target_type: "subscription",
      target_id: userId,
      details: {
        action: "Admin Manually Assigned Plan",
        planId: pkg.id,
        planName: pkg.name,
        validityDays: days,
        startDate: startDateIso,
        endDate,
        proofUrl: String(proofUrl).trim(),
        adminNotes: adminNotes ? String(adminNotes).trim() : undefined,
      },
    });

    return c.json({ success: true, message: `Successfully provisioned ${pkg.name} subscription plan for candidate.` });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/subscriptions - Admin extend or cancel subscription
app.patch("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { subscriptionId, action, extendDays } = await c.req.json();
    const db = c.env.DB;

    const sub = await db
      .prepare("SELECT * FROM user_subscriptions WHERE id = ?")
      .bind(subscriptionId)
      .first<{ id: number; user_id: string; end_date: string; status: string; package_id: number }>();

    if (!sub) {
      return c.json({ error: "Subscription record not found" }, 404);
    }

    if (action === "cancel") {
      await db.prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE id = ?").bind(subscriptionId).run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'UPDATE', 'subscription', ?, ?)`
        )
        .bind(admin.id, sub.user_id, JSON.stringify({ action: "Subscription Cancelled By Admin", subscriptionId }))
        .run();
    } else if (action === "extend") {
      if (!extendDays || Number(extendDays) <= 0) {
        return c.json({ error: "Provide positive extension days count" }, 400);
      }

      const currentExpiry = new Date(sub.end_date);
      const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + Number(extendDays) * 24 * 60 * 60 * 1000).toISOString();

      await db
        .prepare("UPDATE user_subscriptions SET end_date = ?, status = 'active' WHERE id = ?")
        .bind(newExpiry, subscriptionId)
        .run();

      await db
        .prepare(
          `INSERT INTO notifications (user_id, type, title, body, reference_id)
           VALUES (?, 'payment', 'Subscription Plan Extended! ⚡', ?, ?)`
        )
        .bind(sub.user_id, `An administrator has extended your premium membership validity by ${extendDays} days.`, sub.package_id.toString())
        .run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'UPDATE', 'subscription', ?, ?)`
        )
        .bind(admin.id, sub.user_id, JSON.stringify({ action: "Subscription Extended By Admin", subscriptionId, extendedByDays: extendDays, newExpiry }))
        .run();
    } else {
      return c.json({ error: "Invalid action. Choose extend or cancel." }, 400);
    }

    return c.json({ success: true, message: `Successfully processed subscription ${action} operation.` });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

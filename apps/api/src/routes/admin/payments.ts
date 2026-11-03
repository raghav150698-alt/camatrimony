import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requirePermission, requireSuperAdmin } from "../../middleware/auth";
import { processRefund, sendTemplatedEmail } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/payments - List all payments with search and filter
app.get("/", requirePermission("payments"), async (c) => {
  try {
    const db = c.env.DB;
    const status = c.req.query("status");
    const search = c.req.query("search");

    let query = `SELECT p.*, u.email as user_email, pk.name as package_name, pr.full_name as user_full_name
                 FROM payments p
                 LEFT JOIN users u ON p.user_id = u.id
                 LEFT JOIN packages pk ON p.package_id = pk.id
                 LEFT JOIN profiles pr ON p.user_id = pr.user_id
                 WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (u.email LIKE ? OR p.id LIKE ? OR p.order_id LIKE ? OR pr.full_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY p.created_at DESC";

    const stmt = db.prepare(query);
    const rows = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    return c.json({ success: true, payments: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

/**
 * POST /v1/admin/payments/:id/confirm
 * Confirm a manual/UPI payment proof: mark captured, activate subscription, optionally verify user.
 */
app.post("/:id/confirm", requirePermission("payments"), async (c) => {
  const admin = c.get("user")!;
  const paymentId = c.req.param("id");

  try {
    const body = await c.req.json().catch(() => ({} as { activateUser?: boolean; notes?: string }));
    const activateUser = body.activateUser !== false;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const db = c.env.DB;
    const payment = await db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .bind(paymentId)
      .first<{
        id: string;
        user_id: string;
        package_id: number;
        amount: number;
        status: string;
        payment_method: string | null;
      }>();

    if (!payment) {
      return c.json({ error: "Payment record not found" }, 404);
    }

    if (payment.status === "captured" || payment.status === "success") {
      return c.json({ error: "Payment already confirmed" }, 400);
    }

    if (payment.status !== "pending_verification" && payment.status !== "pending") {
      return c.json({ error: `Cannot confirm payment with status '${payment.status}'` }, 400);
    }

    const pkg = await db
      .prepare("SELECT * FROM packages WHERE id = ?")
      .bind(payment.package_id)
      .first<{ id: number; name: string; validity_days: number; contact_limit: number }>();

    if (!pkg) {
      return c.json({ error: "Package bound to payment not found" }, 404);
    }

    const now = new Date().toISOString();
    const endDate = new Date(Date.now() + pkg.validity_days * 24 * 60 * 60 * 1000).toISOString();

    await db
      .prepare(
        `UPDATE payments
         SET status = 'captured', verified_by = ?, verified_at = ?, admin_notes = COALESCE(?, admin_notes), payment_method = COALESCE(payment_method, 'manual')
         WHERE id = ?`
      )
      .bind(admin.id, now, notes || null, paymentId)
      .run();

    await db
      .prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
      .bind(payment.user_id)
      .run();

    await db
      .prepare(
        `INSERT INTO user_subscriptions (user_id, package_id, start_date, end_date, status, payment_id, contact_limit_balance)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(payment.user_id, pkg.id, now, endDate, paymentId, pkg.contact_limit || 0)
      .run();

    if (activateUser) {
      await db
        .prepare("UPDATE users SET status = 'active' WHERE id = ?")
        .bind(payment.user_id)
        .run();
      await db
        .prepare("UPDATE profiles SET is_verified = 1 WHERE user_id = ?")
        .bind(payment.user_id)
        .run();
    }

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'payment', 'Payment Confirmed', ?, ?)`
      )
      .bind(
        payment.user_id,
        `Your ${pkg.name} plan payment was verified. Premium features are now active until ${new Date(endDate).toLocaleDateString("en-IN")}.`,
        paymentId
      )
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'CONFIRM_MANUAL_PAYMENT', 'payment', ?, ?)`
      )
      .bind(
        admin.id,
        paymentId,
        JSON.stringify({
          userId: payment.user_id,
          packageId: pkg.id,
          packageName: pkg.name,
          activateUser,
          notes: notes || null,
        })
      )
      .run();

    return c.json({
      success: true,
      message: `Confirmed payment and activated ${pkg.name} for the member.`,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/payments/:id/refund - Process a refund (super_admin only; fail closed)
app.post("/:id/refund", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;
  const paymentId = c.req.param("id");

  try {
    const body = await c.req.json().catch(() => ({} as { amount?: number; reason?: string }));
    const requestedAmount = typeof body.amount === "number" && body.amount > 0 ? body.amount : undefined;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    const db = c.env.DB;

    const payment = await db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .bind(paymentId)
      .first<{ id: string; user_id: string; amount: number; status: string }>();

    if (!payment) {
      return c.json({ error: "Payment record not found" }, 404);
    }

    if (payment.status === "refunded") {
      return c.json({ error: "Payment is already refunded" }, 400);
    }

    if (payment.status !== "captured" && payment.status !== "success") {
      return c.json({ error: `Cannot refund payment with status '${payment.status}'` }, 400);
    }

    const fullAmountInr = payment.amount / 100;
    const refundAmountInr = requestedAmount ?? fullAmountInr;

    if (refundAmountInr > fullAmountInr) {
      return c.json({ error: "Refund amount exceeds payment amount" }, 400);
    }

    // Fail closed: do NOT mark refunded if Razorpay rejects
    await processRefund(
      c.env,
      paymentId,
      refundAmountInr,
      reason ? { reason } : {}
    );

    await db.prepare("UPDATE payments SET status = 'refunded' WHERE id = ?").bind(paymentId).run();

    await db
      .prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND payment_id = ?")
      .bind(payment.user_id, payment.id)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES (?, 'payment', 'Payment Refunded 🪙', ?)`
      )
      .bind(
        payment.user_id,
        `Your premium subscription payment of ₹${refundAmountInr} has been refunded by administration.${reason ? ` Reason: ${reason}` : ""}`
      )
      .run();

    const userRow = await db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(payment.user_id)
      .first<{ email: string | null }>();

    if (userRow?.email) {
      sendTemplatedEmail(c.env, userRow.email, "refund_processed", {
        name: "Member",
        amount: refundAmountInr,
        paymentId: payment.id,
      }).catch(console.error);
    }

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'REFUND_PAYMENT', 'payment', ?, ?)`
      )
      .bind(
        admin.id,
        payment.id,
        JSON.stringify({
          action: "Admin Processed Refund",
          amount: refundAmountInr,
          reason: reason || null,
          userId: payment.user_id,
        })
      )
      .run();

    return c.json({
      success: true,
      message: `Successfully processed refund of ₹${refundAmountInr} for payment ID: ${paymentId}.`,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Refund failed. Payment was not marked as refunded." }, 500);
  }
});

export default app;

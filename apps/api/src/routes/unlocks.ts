import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/unlocks - Fetch all contact unlocks of a user
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const { results } = await db
      .prepare(`SELECT cu.*, CASE WHEN COALESCE(privacy.hide_contact,0) = 0 THEN u.phone END AS phone,
        CASE WHEN COALESCE(privacy.hide_contact,0) = 0 THEN u.email END AS email FROM contact_unlocks cu
        JOIN users u ON u.id = cu.unlocked_user_id LEFT JOIN user_settings privacy ON privacy.user_id = u.id
        WHERE cu.user_id = ? AND u.status = 'active'
        AND u.id NOT IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = cu.user_id
          UNION SELECT blocker_id FROM blocked_users WHERE blocked_id = cu.user_id
        )`)
      .bind(user.id)
      .all();

    return c.json({ success: true, unlocks: results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/unlocks - Unlock a candidate's contact details
// CRITICAL FIX: balance check + deduction + return real contact info
app.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { targetUserId } = await c.req.json();

    if (!targetUserId) {
      return c.json({ error: "targetUserId is required" }, 400);
    }
    if (targetUserId === user.id) {
      return c.json({ error: "You cannot unlock your own contact details" }, 400);
    }

    const db = c.env.DB;

    const targetVisibility = await db.prepare(`SELECT u.status, COALESCE(s.hide_contact,0) AS hide_contact,
      COALESCE(s.hide_profile,0) AS hide_profile FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?`)
      .bind(targetUserId).first<{ status: string; hide_contact: number; hide_profile: number }>();
    const blocked = await db.prepare(`SELECT 1 FROM blocked_users
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`)
      .bind(user.id, targetUserId, targetUserId, user.id).first();
    if (!targetVisibility || targetVisibility.status !== "active" || targetVisibility.hide_profile === 1 || blocked) {
      return c.json({ error: "This profile is unavailable." }, 404);
    }
    if (targetVisibility.hide_contact === 1) return c.json({ error: "This member is keeping contact details private. No credit was used." }, 409);

    // Verify if already unlocked
    const existing = await db
      .prepare("SELECT id FROM contact_unlocks WHERE user_id = ? AND unlocked_user_id = ?")
      .bind(user.id, targetUserId)
      .first();

    if (existing) {
      // Return the real contact info even if already unlocked
      const target = await db
        .prepare("SELECT email, phone FROM users WHERE id = ?")
        .bind(targetUserId)
        .first<{ email: string | null; phone: string | null }>();

      return c.json({
        success: true,
        alreadyUnlocked: true,
        email: target?.email || null,
        phone: target?.phone || null,
        message: "Contact was already unlocked previously. No extra package view balance deducted.",
      });
    }

    // Check active subscription and contact_limit_balance
    const sub = await db
      .prepare(
        `SELECT id, contact_limit_balance FROM user_subscriptions
         WHERE user_id = ? AND status = 'active' AND end_date > datetime('now')
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(user.id)
      .first<{ id: number; contact_limit_balance: number }>();

    if (!sub) {
      return c.json(
        { error: "No active subscription found. Please subscribe to a plan to unlock contact details." },
        403
      );
    }

    if ((sub.contact_limit_balance || 0) <= 0) {
      return c.json(
        { error: "You have exhausted your contact unlock balance. Please upgrade your plan." },
        403
      );
    }

    // Atomic deduct: only succeed if balance still > 0 (closes TOCTOU race).
    const deduct = await db
      .prepare(
        `UPDATE user_subscriptions
         SET contact_limit_balance = contact_limit_balance - 1
         WHERE id = ? AND contact_limit_balance > 0 AND status = 'active' AND end_date > datetime('now')`
      )
      .bind(sub.id)
      .run();

    if (!deduct.meta?.changes) {
      return c.json(
        { error: "You have exhausted your contact unlock balance. Please upgrade your plan." },
        403
      );
    }

    try {
      await db
        .prepare("INSERT INTO contact_unlocks (user_id, unlocked_user_id) VALUES (?, ?)")
        .bind(user.id, targetUserId)
        .run();
    } catch (insertErr) {
      // Roll back the debit if unlock insert fails (e.g. unique race).
      await db
        .prepare(
          "UPDATE user_subscriptions SET contact_limit_balance = contact_limit_balance + 1 WHERE id = ?"
        )
        .bind(sub.id)
        .run();
      throw insertErr;
    }

    // Fetch the target user's REAL contact info from D1
    const target = await db
      .prepare("SELECT email, phone FROM users WHERE id = ?")
      .bind(targetUserId)
      .first<{ email: string | null; phone: string | null }>();

    const refreshed = await db
      .prepare("SELECT contact_limit_balance FROM user_subscriptions WHERE id = ?")
      .bind(sub.id)
      .first<{ contact_limit_balance: number }>();

    return c.json({
      success: true,
      alreadyUnlocked: false,
      email: target?.email || null,
      phone: target?.phone || null,
      remainingBalance: refreshed?.contact_limit_balance ?? Math.max(0, (sub.contact_limit_balance || 0) - 1),
      message: "Contact unlocked successfully! 1 premium contact view has been deducted.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

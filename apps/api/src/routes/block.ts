import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";
import { parsePhotos } from "../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/block - List blocked users
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const rows = await db
      .prepare(
        `SELECT b.created_at as blocked_at, b.reason, p.user_id, p.gender, p.age, p.highest_degree,
                p.occupation, p.work_location, p.city, p.state, p.photos, p.is_verified
         FROM blocked_users b
         LEFT JOIN profiles p ON b.blocked_id = p.user_id
         WHERE b.blocker_id = ?
         ORDER BY b.created_at DESC`
      )
      .bind(user.id)
      .all();

    const results = (rows.results || []).map((row: any) => ({ ...row, photos: parsePhotos(row.photos) }));

    return c.json({ success: true, blockedUsers: results });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/block - Block a user profile
app.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { blockedId, reason } = await c.req.json();

    if (!blockedId) {
      return c.json({ error: "Blocked User ID is required" }, 400);
    }
    if (blockedId === user.id) {
      return c.json({ error: "You cannot block yourself" }, 400);
    }

    const db = c.env.DB;

    await db
      .prepare(
        `INSERT INTO blocked_users (blocker_id, blocked_id, reason)
         VALUES (?, ?, ?)
         ON CONFLICT(blocker_id, blocked_id) DO UPDATE SET
           reason = excluded.reason,
           created_at = CURRENT_TIMESTAMP`
      )
      .bind(user.id, blockedId, reason || null)
      .run();

    await db
      .prepare("DELETE FROM interest_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)")
      .bind(user.id, blockedId, blockedId, user.id)
      .run();

    return c.json({ success: true, message: "Matrimonial profile has been blocked successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/block - Unblock a user profile
app.delete("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const blockedId = c.req.query("blockedId");

    if (!blockedId) {
      return c.json({ error: "Blocked User ID is required" }, 400);
    }

    const db = c.env.DB;
    await db
      .prepare("DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?")
      .bind(user.id, blockedId)
      .run();

    return c.json({ success: true, message: "Matrimonial profile has been unblocked successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

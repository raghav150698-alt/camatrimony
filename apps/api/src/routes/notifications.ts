import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/notifications - Fetch user's notification log
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;

    const visibility = `user_id = ? AND CASE type
      WHEN 'interest' THEN COALESCE((SELECT notify_interests FROM user_settings WHERE user_id = notifications.user_id),1)
      WHEN 'message' THEN COALESCE((SELECT notify_messages FROM user_settings WHERE user_id = notifications.user_id),1)
      WHEN 'kyc' THEN COALESCE((SELECT notify_kyc FROM user_settings WHERE user_id = notifications.user_id),1)
      WHEN 'payment' THEN COALESCE((SELECT notify_payments FROM user_settings WHERE user_id = notifications.user_id),1)
      ELSE 1 END = 1`;
    const rows = await db
      .prepare(
        `SELECT * FROM notifications
         WHERE ${visibility}
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .bind(user.id)
      .all();

    const unreadCountRow = await db
      .prepare(`SELECT COUNT(*) as count FROM notifications WHERE ${visibility} AND is_read = 0`)
      .bind(user.id)
      .first<{ count: number }>();

    return c.json({
      success: true,
      notifications: rows.results || [],
      unreadCount: unreadCountRow?.count || 0,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/notifications - Mark notifications as read
app.patch("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { notificationId, markAll } = await c.req.json();
    const db = c.env.DB;

    if (markAll) {
      await db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").bind(user.id).run();
    } else if (notificationId) {
      const notif = await db
        .prepare("SELECT user_id FROM notifications WHERE id = ?")
        .bind(notificationId)
        .first<{ user_id: string }>();

      if (!notif) {
        return c.json({ error: "Notification record not found" }, 404);
      }
      if (notif.user_id !== user.id) {
        return c.json({ error: "Forbidden: unauthorized access to notification" }, 403);
      }

      await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").bind(notificationId).run();
    } else {
      return c.json({ error: "Provide notificationId or markAll flag" }, 400);
    }

    return c.json({ success: true, message: "Notifications updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

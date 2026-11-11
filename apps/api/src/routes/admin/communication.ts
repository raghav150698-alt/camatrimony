import { Hono } from "hono";
import { rateLimit } from '../../middleware/rate-limit';
import type { Env, HonoVariables } from "../../types";
import { requirePermission } from "../../middleware/auth";
import { sendTemplatedEmail, type EmailTemplate } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/communication - List announcements/communications
app.get("/", requirePermission("communication"), async (c) => {
  try {
    const db = c.env.DB;

    // Communications are stored as cms_settings with prefix "announcement_"
    const rows = await db
      .prepare("SELECT * FROM cms_settings WHERE setting_key LIKE 'announcement_%' ORDER BY setting_key DESC")
      .all<any>();

    const announcements = (rows.results || []).map((row: any) => ({
      key: row.setting_key,
      value: row.setting_value,
    }));

    return c.json({ success: true, announcements });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/communication - Create/broadcast an announcement
app.post("/", requirePermission("communication"), rateLimit({windowMs: 300000, max: 1, keyBy: 'user'}), async (c) => {
  const admin = c.get("user")!;

  try {
    const { title, message, broadcast, templateName } = await c.req.json();

    if (!title || !message) {
      return c.json({ error: "title and message are required" }, 400);
    }

    const db = c.env.DB;
    const announcementKey = `announcement_${Date.now()}`;

    // Store the announcement
    await db
      .prepare("INSERT OR REPLACE INTO cms_settings (setting_key, setting_value) VALUES (?, ?)")
      .bind(announcementKey, JSON.stringify({ title, message, createdAt: new Date().toISOString(), createdBy: admin.id }))
      .run();

    // If broadcast is true, send notification to all active users
    if (broadcast) {
      const users = await db
        .prepare("SELECT id, email FROM users WHERE status = 'active' AND role NOT IN ('admin', 'super_admin')")
        .all<any>();

      let sentCount = 0;
      for (const user of users.results || []) {
        await db
          .prepare(
            `INSERT INTO notifications (user_id, type, title, body)
             VALUES (?, 'system', ?, ?)`
          )
          .bind(user.id, title, message)
          .run();

        if (templateName && user.email) {
          const sent = await sendTemplatedEmail(c.env, user.email, templateName as EmailTemplate, {
            name: "Member",
            reason: message,
          });
          if (sent) sentCount++;
        }
        sentCount++;
      }

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'BROADCAST', 'communication', ?, ?)`
        )
        .bind(admin.id, announcementKey, JSON.stringify({ title, message, broadcast, recipients: (users.results || []).length, sentCount }))
        .run();

      return c.json({
        success: true,
        message: `Announcement created and broadcast to ${(users.results || []).length} users.`,
      });
    }

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'CREATE', 'communication', ?, ?)`
      )
      .bind(admin.id, announcementKey, JSON.stringify({ title, message }))
      .run();

    return c.json({ success: true, message: "Announcement created successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

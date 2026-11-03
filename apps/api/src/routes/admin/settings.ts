import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireSuperAdmin } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/settings - Fetch system settings (from cms_settings table)
app.get("/", requireSuperAdmin, async (c) => {
  try {
    const db = c.env.DB;

    const rows = await db.prepare("SELECT * FROM cms_settings").all<any>();
    const settings: Record<string, string> = {};
    (rows.results || []).forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });

    return c.json({ success: true, settings });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/settings - Update system settings
app.patch("/", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const body = await c.req.json();
    const db = c.env.DB;

    // body is a key-value map of settings to update
    const entries = Object.entries(body);
    if (entries.length === 0) {
      return c.json({ error: "No settings provided to update" }, 400);
    }

    for (const [key, value] of entries) {
      await db
        .prepare("INSERT OR REPLACE INTO cms_settings (setting_key, setting_value) VALUES (?, ?)")
        .bind(key, String(value))
        .run();
    }

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, details)
         VALUES (?, 'UPDATE_SETTINGS', 'settings', ?)`
      )
      .bind(admin.id, JSON.stringify({ updatedKeys: entries.map(([k]) => k) }))
      .run();

    return c.json({ success: true, message: "System settings updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

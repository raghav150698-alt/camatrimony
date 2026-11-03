import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requirePermission } from "../../middleware/rbac";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/audit - Retrieve all administrator action logs
app.get("/", requirePermission("audit"), async (c) => {
  try {
    const db = c.env.DB;

    const rows = await db
      .prepare(
        `SELECT l.*,
                COALESCE(aa.email, u.email) as admin_email,
                COALESCE(aa.role, u.role) as admin_role,
                aa.username as admin_username,
                aa.display_name as admin_display_name
         FROM admin_audit_log l
         LEFT JOIN admin_accounts aa ON l.admin_id = aa.id
         LEFT JOIN users u ON l.admin_id = u.id
         ORDER BY l.created_at DESC
         LIMIT 200`
      )
      .all();

    return c.json({ success: true, auditLogs: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

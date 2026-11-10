import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin, requireSuperAdmin } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/roles - Fetch all administrative console users and assigned roles
app.get("/", requireAdmin, async (c) => {
  try {
    const db = c.env.DB;

    const rows = await db
      .prepare(
        `SELECT a.id,a.email,NULL AS phone,a.role,CASE WHEN a.is_active=1 THEN 'active' ELSE 'suspended' END AS status,a.last_login_at
         FROM admin_accounts a
         UNION SELECT u.id,u.email,u.phone,r.role,u.status,u.last_login_at FROM users u
         JOIN admin_roles r ON r.user_id=u.id WHERE NOT EXISTS(SELECT 1 FROM admin_accounts a WHERE a.id=u.id)`
      )
      .all<any>();

    return c.json({ success: true, admins: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/roles - Provision or adjust administrative roles (super admin only)
app.post("/", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { email, phone, role, action, targetUserId } = await c.req.json();
    const db = c.env.DB;

    // Action 1: Add new admin user
    if (action === "addAdmin") {
      if (!email || !role) {
        return c.json({ error: "email and role are required" }, 400);
      }

      const ALLOWED_ROLES = ["super_admin", "moderator", "support_agent"] as const;
      if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
        return c.json(
          { error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}` },
          400
        );
      }

      const existingUser = await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(email)
        .first<any>();

      let userId = "";
      if (existingUser) {
        userId = existingUser.id;
        await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();
      } else {
        if(c.env.AUTH_PROVIDER==='supabase')return c.json({error:'This staff member must sign in once before you assign access.'},409);
        userId = "admin_" + Math.random().toString(36).substring(2, 10);
        await db
          .prepare("INSERT INTO users (id, email, phone, role, status) VALUES (?, ?, ?, ?, 'active')")
          .bind(userId, email, phone || null, role)
          .run();
      }

      await db
        .prepare("INSERT OR REPLACE INTO admin_roles (user_id, role, assigned_by) VALUES (?, ?, ?)")
        .bind(
          userId,
          role,
          admin.id
        )
        .run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'PROVISION_ADMIN', 'admin', ?, ?)`
        )
        .bind(admin.id, userId, JSON.stringify({ action: "Provisioned new admin account", email, role }))
        .run();

      return c.json({ success: true, message: `Successfully provisioned ${role} access for ${email}.` });
    }

    // Action 2: Remove admin access / revoke
    if (action === "revokeAdmin") {
      if (!targetUserId) {
        return c.json({ error: "targetUserId is required" }, 400);
      }

      if (targetUserId === admin.id) {
        return c.json({ error: "You cannot revoke your own admin permissions." }, 400);
      }

      await db.prepare('UPDATE admin_accounts SET is_active=0 WHERE id=?').bind(targetUserId).run();
      await db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').bind(targetUserId).run();
      await db.prepare("UPDATE users SET role = 'user' WHERE id = ?").bind(targetUserId).run();
      await db.prepare("DELETE FROM admin_roles WHERE user_id = ?").bind(targetUserId).run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'REVOKE_ADMIN', 'admin', ?, ?)`
        )
        .bind(admin.id, targetUserId, JSON.stringify({ action: "Revoked administrative access privileges" }))
        .run();

      return c.json({ success: true, message: "Administrative privileges successfully revoked." });
    }

    return c.json({ error: "Invalid action specified" }, 400);
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

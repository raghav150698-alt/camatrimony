import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { generateAdminToken, hashToken } from "../../middleware/admin-auth";
import {getAdminUser} from "../../middleware/auth";
import { verifyPassword } from "../../lib/password";
import { rateLimit } from '../../middleware/rate-limit';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// POST /v1/admin/auth - Validates admin username + password and returns a session token
// CRITICAL FIX: Remove hardcoded credentials, use admin_accounts table from D1,
// generate HMAC-SHA256 session token using ADMIN_JWT_SECRET, store session in admin_sessions table
app.post("/", rateLimit({windowMs: 900000, max: 5, message: 'Too many login attempts. Try again in 15 minutes.'}), async (c) => {
  if(c.env.AUTH_PROVIDER === "supabase") return c.json({success:false,message:"Please sign in with your administrator email."},401);
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, message: "Username and password are required." }, 400);
    }

    const secret = c.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error("[Admin Auth] ADMIN_JWT_SECRET is not configured");
      return c.json({ success: false, message: "Server misconfiguration: admin secret missing." }, 500);
    }

    const ip = c.req.header("x-forwarded-for") || "unknown";
    const db = c.env.DB;

    // Validate against admin_accounts table
    let adminAccount: { id: string; username: string; display_name: string | null; email: string | null; role: string } | null = null;

    try {
      const dbAdmin = await db
        .prepare("SELECT * FROM admin_accounts WHERE username = ? AND is_active = 1 LIMIT 1")
        .bind(username.trim())
        .first<any>();

      if (dbAdmin && dbAdmin.password_hash) {
        // Compare password using PBKDF2 hash (edge-compatible Web Crypto)
        const isPasswordValid = await verifyPassword(password, dbAdmin.password_hash);
        if (isPasswordValid) {
          adminAccount = {
            id: dbAdmin.id,
            username: dbAdmin.username,
            display_name: dbAdmin.display_name || dbAdmin.username,
            email: dbAdmin.email || "",
            role: dbAdmin.role || "moderator",
          };
        }
      }
    } catch (err) {
      console.error("[Admin Auth] admin_accounts lookup failed:", err);
    }

    if (!adminAccount) {
      return c.json({ success: false, message: "Invalid username or password. Access denied." }, 401);
    }

    // Generate HMAC-SHA256 session token
    const token = await generateAdminToken(adminAccount.id, adminAccount.role, secret);

    // Store session in admin_sessions — required for subsequent API auth (logout/revoke).
    const sessionId = `sess_${adminAccount.id}_${Date.now()}`;
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      await db
        .prepare(
          `INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, expires_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(sessionId, adminAccount.id, tokenHash, ip, expiresAt)
        .run();

      await db
        .prepare("UPDATE admin_accounts SET last_login_at = datetime('now') WHERE id = ?")
        .bind(adminAccount.id)
        .run();
    } catch (sessionErr) {
      console.error("[Admin Auth] Failed to persist admin session:", sessionErr);
      return c.json(
        { success: false, message: "Could not create admin session. Please try again." },
        500
      );
    }

    // Log the login in audit log
    try {
      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details, ip_address, created_at)
           VALUES (?, 'LOGIN', 'system', 'admin_login', ?, ?, datetime('now'))`
        )
        .bind(adminAccount.id, JSON.stringify({ username: adminAccount.username, role: adminAccount.role }), ip)
        .run();
    } catch {
      // Non-critical — audit log may not exist yet
    }

    return c.json({
      success: true,
      token,
      admin: {
        id: adminAccount.id,
        username: adminAccount.username,
        displayName: adminAccount.display_name,
        role: adminAccount.role,
        email: adminAccount.email,
      },
    });
  } catch (err) {
    console.error("[Admin Auth] Error:", err);
    return c.json({ success: false, message: "Authentication service error. Try again." }, 500);
  }
});

// POST /v1/admin/auth/logout - Clear admin session (client drops token; server best-effort cleanup)
app.post("/logout", async (c) => {
  const token = c.req.header("x-admin-token");
  if (token) {
    try {
      const db = c.env.DB;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
    } catch {
      // non-critical
    }
  }
  return c.json({ success: true, message: "Logged out successfully." });
});

// GET /v1/admin/auth/validate - Validate existing admin session token
app.get("/validate", async (c) => {
  const admin = await getAdminUser(c);
  if(!admin) return c.json({success:false,valid:false,message:'Invalid or expired administrator session.'},401);
  const row = await c.env.DB.prepare('SELECT username,display_name FROM admin_accounts WHERE id = ?').bind(admin.id)
    .first<{username:string;display_name:string}>();
  return c.json({success:true,valid:true,admin:{...admin,username:row?.username || admin.email || 'Administrator',displayName:row?.display_name || admin.email || 'Administrator'}});
});

export default app;

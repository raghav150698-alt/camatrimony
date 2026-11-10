import { HTTPException } from "hono/http-exception";
import {verifySupabaseIdentity, resolveMemberIdentity} from "../services/supabase-auth";
import type { Context, MiddlewareHandler } from "hono";
import { verifyFirebaseToken } from "@camatrimony/auth/server";
import type { Env, HonoVariables, AuthUser, AdminRole } from "../types";
import { PERMISSION_MATRIX } from "../types";
import { hashToken, verifyAdminToken } from "./admin-auth";

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

/**
 * Extracts and verifies the configured auth provider identity from the Authorization header.
 * No x-user-id header or userId query param is trusted.
 */
export async function getAuthenticatedUser(c: AppContext): Promise<AuthUser | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  if(c.env.AUTH_PROVIDER && !["firebase","supabase"].includes(c.env.AUTH_PROVIDER))throw new HTTPException(503,{message:"Sign-in is temporarily unavailable."});
  const token = authHeader.substring(7);
  if (!token) return null;

  const projectId = c.env.FIREBASE_PROJECT_ID;
  if (c.env.AUTH_PROVIDER !== "supabase" && !projectId) {
    console.error("FIREBASE_PROJECT_ID is not configured");
    return null;
  }

  // In development only, allow mock tokens for UI testing without real Firebase.
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(c.req.url).hostname);
  if (c.env.ENVIRONMENT === "development" && c.env.LOCAL_REVIEW_AUTH === "true" && localHost && token === "mock-user-review") {
    const reviewUser = await c.env.DB.prepare("SELECT email, status FROM users WHERE id = ?").bind(token).first<{ email: string; status: string }>();
    if (!reviewUser) return null;
    return { id: token, email: reviewUser.email, role: "user", isBanned: reviewUser.status !== "active" };
  }

  const supabase = c.env.AUTH_PROVIDER === 'supabase'
    ? await verifySupabaseIdentity(token,c.env) : null;
  const payload = c.env.AUTH_PROVIDER === 'supabase' ? null : await verifyFirebaseToken(token, projectId);
  if (!supabase && !payload) return null;
  try {
    const db = c.env.DB;
    const userId = supabase ? await resolveMemberIdentity(supabase,db) : payload!.sub || payload!.user_id;
    if (!userId) return null;
    const authEmail = supabase?.email_confirmed_at ? supabase.email : payload?.email;

    const userRow = await db
      .prepare("SELECT id, email, role, status FROM users WHERE id = ?")
      .bind(userId)
      .first<{ id: string; email: string | null; role: string; status: string }>();

    const isBanned =
      !!userRow && (userRow.status === "banned" || userRow.status === "suspended");

    if (isBanned) {
      return { id: userId, email: userRow?.email || authEmail || null, role: "user", isBanned: true };
    }

    const adminRoleRow = await db
      .prepare("SELECT role FROM admin_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();

    const resolvedRole: "user" | AdminRole = (adminRoleRow?.role as AdminRole) || "user";

    return {
      id: userId,
      email: userRow?.email || authEmail || null,
      role: resolvedRole,
      isBanned: false,
    };
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    console.error("Auth database unavailable:", err);
    throw new HTTPException(503, {message:'Sign-in is temporarily unavailable. Please try again.'});
  }
}

/**
 * Extracts an admin user from either a Firebase admin token (Authorization header)
 * or a dedicated admin session token (x-admin-token header) signed with
 * ADMIN_JWT_SECRET and looked up in admin_accounts.
 */
export async function getAdminUser(c: AppContext): Promise<AuthUser | null> {
  if (c.env.AUTH_PROVIDER === 'supabase') {
    const token = c.req.header('Authorization')?.replace(/^Bearer /,'');
    if (!token) return null;
    const identity = await verifySupabaseIdentity(token,c.env);
    if (!identity) return null;
    const admin = await c.env.DB.prepare(`SELECT id,email,role FROM admin_accounts
      WHERE supabase_subject = ? AND is_active = 1`).bind(identity.id)
      .first<{id:string;email:string;role:AdminRole}>();
    if(admin && ['super_admin','moderator','support_agent'].includes(admin.role))return {...admin,isBanned:false};
    const memberAdmin=await c.env.DB.prepare(`SELECT u.id,u.email,r.role FROM auth_identities a
      JOIN users u ON u.id=a.user_id JOIN admin_roles r ON r.user_id=u.id
      WHERE a.provider='supabase' AND a.subject=? AND u.status NOT IN ('banned','suspended','deleted')`)
      .bind(identity.id).first<{id:string;email:string;role:AdminRole}>();
    return memberAdmin && ['super_admin','moderator','support_agent'].includes(memberAdmin.role) ? {...memberAdmin,isBanned:false} : null;
  }
  // Prefer Firebase-based admin auth if available
  const firebaseUser = await getAuthenticatedUser(c);
  if (firebaseUser && !firebaseUser.isBanned && (firebaseUser.role === "super_admin" || firebaseUser.role === "moderator" || firebaseUser.role === "support_agent")) {
    return firebaseUser;
  }

  // Fall back to dedicated admin session token
  const adminToken = c.req.header("x-admin-token");
  if (!adminToken) return null;

  const secret = c.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error("ADMIN_JWT_SECRET is not configured");
    return null;
  }

  const decoded = await verifyAdminToken(adminToken, secret);
  if (!decoded) return null;

  try {
    const db = c.env.DB;

    // Require a live admin_sessions row so logout / expiry actually revoke access.
    const tokenHash = await hashToken(adminToken);
    const session = await db
      .prepare(
        `SELECT admin_id FROM admin_sessions
         WHERE token_hash = ? AND admin_id = ? AND julianday(expires_at) > julianday('now')
         LIMIT 1`
      )
      .bind(tokenHash, decoded.sub)
      .first<{ admin_id: string }>();

    if (!session) return null;

    const adminRow = await db
      .prepare("SELECT id, email, role FROM admin_accounts WHERE id = ? AND is_active = 1")
      .bind(decoded.sub)
      .first<{ id: string; email: string | null; role: string }>();

    if (!adminRow) return null;

    const role = adminRow.role as AuthUser["role"];
    if (role !== "super_admin" && role !== "moderator" && role !== "support_agent") {
      return null;
    }

    return {
      id: adminRow.id,
      email: adminRow.email,
      role,
      isBanned: false,
    };
  } catch (err) {
    console.error("Admin session lookup failed:", err);
    return null;
  }
}

/**
 * Middleware: Ensures any authenticated user (not banned).
 */
export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.isBanned) {
    return c.json(
      { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
      user?.isBanned ? 403 : 401
    );
  }
  c.set("user", user);
  await next();
};

/**
 * Middleware: Ensures user is an Administrator (Super Admin, Moderator, or Support Agent).
 */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> = async (c, next) => {
  const user = await getAdminUser(c);
  if (!user || user.isBanned) {
    return c.json(
      { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
      user?.isBanned ? 403 : 401
    );
  }
  c.set("user", user);
  await next();
};

/**
 * Middleware: Ensures user is a Super Admin.
 */
export const requireSuperAdmin: MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> = async (c, next) => {
  const user = await getAdminUser(c);
  if (!user || user.isBanned) {
    return c.json(
      { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
      user?.isBanned ? 403 : 401
    );
  }
  if (user.role !== "super_admin") {
    return c.json({ error: "Forbidden: Super Admin privileges required" }, 403);
  }
  c.set("user", user);
  await next();
};

/**
 * Helper: Checks if the user has permissions for a specific module.
 * Returns true if allowed, false otherwise (also sets user on context).
 */
export async function checkPermission(c: AppContext, module: string): Promise<boolean> {
  const user = await getAdminUser(c);
  if (!user || user.isBanned) return false;
  c.set("user", user);
  const role = user.role as AdminRole;
  return PERMISSION_MATRIX[module]?.[role] ?? false;
}

/**
 * Middleware factory: Checks permission for a specific module.
 */
export const requirePermission = (module: string): MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> =>
  async (c, next) => {
    const ok = await checkPermission(c, module);
    if (!ok) {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: authentication required" }, 401);
      }
      return c.json({ error: `Forbidden: no permission to access ${module} module` }, 403);
    }
    await next();
  };

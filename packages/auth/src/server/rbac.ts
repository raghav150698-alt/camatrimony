/**
 * RBAC middleware for Hono framework.
 */
import type { Context, MiddlewareHandler } from "hono";
import { verifyFirebaseToken } from "./jwt";
import { hasPermission } from "@camatrimony/shared";
import type { AuthUser, AdminRole } from "@camatrimony/shared";

// Extend Hono context variables
declare module "hono" {
  interface Variables {
    user: AuthUser | null;
  }
}

/**
 * Extracts and verifies the Firebase user from the Authorization header.
 * No x-user-id header or userId query param is trusted.
 */
export async function getAuthenticatedUser(c: Context): Promise<AuthUser | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  const projectId =
    c.env?.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("FIREBASE_PROJECT_ID is not configured");
    return null;
  }

  // In development only, allow mock tokens for UI testing without real Firebase.
  if (c.env?.ENVIRONMENT === "development" && token.startsWith("mock-user-")) {
    return { id: token, email: null, role: "user", isBanned: false };
  }

  const payload = await verifyFirebaseToken(token, projectId);
  if (!payload) {
    return null;
  }

  const userId = payload.sub || payload.user_id;
  if (!userId) {
    return null;
  }

  return {
    id: userId,
    email: payload.email || null,
    role: "user",
    isBanned: false,
  };
}

/**
 * Middleware: Ensures any authenticated user.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  c.set("user", user);

  if (!user || user.isBanned) {
    return c.json(
      { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
      user?.isBanned ? 403 : 401
    );
  }

  await next();
};

/**
 * Middleware: Ensures user is an Administrator.
 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  c.set("user", user);

  if (!user || user.isBanned) {
    return c.json(
      { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
      user?.isBanned ? 403 : 401
    );
  }

  const isAdmin = user.role === "super_admin" || user.role === "moderator" || user.role === "support_agent";
  if (!isAdmin) {
    return c.json({ error: "Forbidden: administrator privileges required" }, 403);
  }

  await next();
};

/**
 * Middleware: Ensures user is a Super Admin.
 */
export const requireSuperAdmin: MiddlewareHandler = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  c.set("user", user);

  if (!user || user.isBanned) {
    return c.json(
      { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
      user?.isBanned ? 403 : 401
    );
  }

  if (user.role !== "super_admin") {
    return c.json({ error: "Forbidden: Super Admin privileges required" }, 403);
  }

  await next();
};

/**
 * Middleware factory: Checks permission for a specific module.
 */
export function checkPermission(module: string): MiddlewareHandler {
  return async (c, next) => {
    const user = await getAuthenticatedUser(c);
    c.set("user", user);

    if (!user || user.isBanned) {
      return c.json(
        { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
        user?.isBanned ? 403 : 401
      );
    }

    const isAdmin = user.role === "super_admin" || user.role === "moderator" || user.role === "support_agent";
    if (!isAdmin) {
      return c.json({ error: "Forbidden: administrator privileges required" }, 403);
    }

    const role = user.role as AdminRole;
    const isAllowed = hasPermission(module, role);
    if (!isAllowed) {
      return c.json({ error: `Forbidden: no permission to access ${module} module` }, 403);
    }

    await next();
  };
}

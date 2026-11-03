import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables, AdminRole } from "../types";
import { PERMISSION_MATRIX } from "../types";
import { getAdminUser } from "./auth";

/**
 * Middleware factory: Checks RBAC permission for a specific module.
 * Requires the user to be an admin with the specified module permission.
 */
export const requirePermission = (module: string): MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> =>
  async (c, next) => {
    const user = await getAdminUser(c);
    if (!user || user.isBanned) {
      return c.json(
        { error: user?.isBanned ? "Account is banned" : "Unauthorized: authentication required" },
        user?.isBanned ? 403 : 401
      );
    }
    c.set("user", user);

    const isAdmin = user.role === "super_admin" || user.role === "moderator" || user.role === "support_agent";
    if (!isAdmin) {
      return c.json({ error: "Forbidden: administrator privileges required" }, 403);
    }

    const role = user.role as AdminRole;
    const isAllowed = PERMISSION_MATRIX[module]?.[role] ?? false;
    if (!isAllowed) {
      return c.json({ error: `Forbidden: no permission to access ${module} module` }, 403);
    }

    await next();
  };

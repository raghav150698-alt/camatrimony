import type { AdminRole } from "../types/user";

// RBAC Permission Map
export const PERMISSION_MATRIX: Record<string, Record<AdminRole, boolean>> = {
  dashboard: { super_admin: true, moderator: true, support_agent: true },
  users: { super_admin: true, moderator: true, support_agent: true },
  kyc: { super_admin: true, moderator: true, support_agent: false },
  subscriptions: { super_admin: true, moderator: true, support_agent: true },
  payments: { super_admin: true, moderator: true, support_agent: true },
  matches: { super_admin: true, moderator: true, support_agent: true },
  communication: { super_admin: true, moderator: true, support_agent: false },
  moderation: { super_admin: true, moderator: true, support_agent: true },
  mediation: { super_admin: true, moderator: true, support_agent: true },
  cms: { super_admin: true, moderator: false, support_agent: false },
  analytics: { super_admin: true, moderator: true, support_agent: false },
  audit: { super_admin: true, moderator: true, support_agent: false },
  settings: { super_admin: true, moderator: false, support_agent: false },
  admin_roles: { super_admin: true, moderator: false, support_agent: false },
  packages: { super_admin: true, moderator: false, support_agent: false },
  photos: { super_admin: true, moderator: true, support_agent: false },
  support: { super_admin: true, moderator: false, support_agent: true },
};

export function hasPermission(module: string, role: AdminRole): boolean {
  return PERMISSION_MATRIX[module]?.[role] ?? false;
}

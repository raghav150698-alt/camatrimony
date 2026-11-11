// Shared Hono app types for the CA Matrimony API Worker.

export type AdminRole = "super_admin" | "moderator" | "support_agent";

export interface AuthUser {
  id: string;
  email: string | null;
  role: "user" | AdminRole;
  isBanned: boolean;
}

export interface AuthAdmin {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
}

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATE_LIMITER?: DurableObjectNamespace;
  CORS_ORIGIN: string;
  ENVIRONMENT?: string;
  LOCAL_REVIEW_AUTH?: string;
  /** Absolute API base including `/v1`, e.g. https://…workers.dev/v1 */
  PUBLIC_API_BASE?: string;
  AUTH_PROVIDER?: "firebase" | "supabase";
  SUBSCRIPTION_MODE?: "contact" | "checkout";
  MEDIA_SIGNING_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  FIREBASE_PROJECT_ID: string;

  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  FROM_EMAIL?: string;
  ADMIN_JWT_SECRET: string;
}

export interface HonoVariables {
  user: AuthUser;
  admin: AuthAdmin;
}

// RBAC Permission Matrix
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

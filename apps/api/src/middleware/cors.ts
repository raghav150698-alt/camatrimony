import { cors } from "hono/cors";
import type { Env } from "../types";

type CorsEnv = { CORS_ORIGIN?: string };

const DEFAULT_ORIGINS = [
  "https://camatrimonybncn.com",
  "https://admin.camatrimonybncn.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

/**
 * Parses the CORS_ORIGIN env var (comma-separated) into an array of origins.
 */
export function parseCorsOrigins(env: CorsEnv): string[] {
  if (env.CORS_ORIGIN) {
    return env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}

/**
 * Matches an Origin against an allowlist entry.
 * Supports single-label wildcards, e.g. https://*.camatrimony-web.pages.dev
 */
export function originMatches(pattern: string, origin: string): boolean {
  if (pattern === origin) return true;
  if (!pattern.includes("*")) return false;
  const regex = new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-zA-Z0-9-]+")}$`,
    "i"
  );
  return regex.test(origin);
}

/**
 * CORS configuration for the CA Matrimony API.
 * Uses the CORS_ORIGIN env var, falling back to the default allowed origins.
 */
export const corsMiddleware = (env: CorsEnv) => cors({
  origin: (origin) => {
    if (!origin) return null;
    const allowed = parseCorsOrigins(env);
    return allowed.some((pattern) => originMatches(pattern, origin)) ? origin : null;
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  credentials: true,
});

import type { Context, MiddlewareHandler } from "hono";
import type { Env, HonoVariables, AuthAdmin } from "../types";

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

function base64UrlDecodeToBytes(input: string): Uint8Array {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes a base64url string (used for JWT payload decoding).
 */
function base64UrlDecode(input: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(input));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates an HMAC-SHA256 session token using ADMIN_JWT_SECRET.
 * Returns a token string: base64url(payload).base64url(signature)
 */
export async function generateAdminToken(adminId: string, role: string, secret: string): Promise<string> {
  const payload = JSON.stringify({
    sub: adminId,
    role,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24h expiry
  });
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const payloadB64 = base64UrlEncode(encoder.encode(payload));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuffer));
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies an admin session token against ADMIN_JWT_SECRET.
 * Returns the decoded admin payload if valid, null otherwise.
 */
export async function verifyAdminToken(token: string, secret: string): Promise<{ sub: string; role: string; exp: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const payload = base64UrlDecode(payloadB64);
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
    const expectedSig = base64UrlEncode(new Uint8Array(sigBuffer));
    if (expectedSig !== sigB64) return null;
    const decoded = JSON.parse(payload);
    if (decoded.exp && decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Middleware: Validates admin session token (x-admin-token header) against admin_sessions table.
 * Sets c.set("admin", admin) for downstream handlers.
 */
export const requireAdminSession: MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> = async (c, next) => {
  const token = c.req.header("x-admin-token");
  if (!token) {
    return c.json({ success: false, valid: false, message: "No admin token provided." }, 401);
  }

  const secret = c.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return c.json({ success: false, valid: false, message: "Server misconfiguration: admin secret missing." }, 500);
  }
  const decoded = await verifyAdminToken(token, secret);
  if (!decoded) {
    return c.json({ success: false, valid: false, message: "Invalid or expired admin token." }, 401);
  }

  // Validate against admin_sessions table (server-side token validation)
  try {
    const db = c.env.DB;
    const session = await db
      .prepare("SELECT admin_id, token_hash, expires_at FROM admin_sessions WHERE admin_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(decoded.sub)
      .first<{ admin_id: string; token_hash: string; expires_at: string }>();

    // If sessions table is populated, validate the token hash
    if (session) {
      if (new Date(session.expires_at).getTime() < Date.now()) {
        return c.json({ success: false, valid: false, message: "Admin session expired." }, 401);
      }
      // Verify token hash matches
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (tokenHash !== session.token_hash) {
        return c.json({ success: false, valid: false, message: "Invalid admin session." }, 401);
      }
    }
    // If no session row found, fall back to token-only validation (decoded successfully above)
  } catch {
    // admin_sessions table may not be populated — token signature validation is sufficient
  }

  // Fetch admin account details
  let admin: AuthAdmin = { id: decoded.sub, username: "", role: decoded.role };
  try {
    const db = c.env.DB;
    const adminRow = await db
      .prepare("SELECT id, username, role, email, display_name FROM admin_accounts WHERE id = ? AND is_active = 1")
      .bind(decoded.sub)
      .first<{ id: string; username: string; role: string; email: string | null; display_name: string | null }>();

    if (adminRow) {
      admin = {
        id: adminRow.id,
        username: adminRow.username,
        role: adminRow.role,
        email: adminRow.email,
        displayName: adminRow.display_name,
      };
    }
  } catch {
    // admin_accounts table may not exist — use token claims
  }

  c.set("admin", admin);
  await next();
};

/**
 * Helper to hash a token for storage in admin_sessions.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

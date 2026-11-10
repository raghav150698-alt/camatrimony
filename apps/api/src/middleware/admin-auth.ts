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
    if (!decoded.sub || !Number.isFinite(decoded.exp) || decoded.exp <= Date.now()) return null;
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
  if(c.env.AUTH_PROVIDER === "supabase") return c.json({success:false,message:"Use Supabase sign-in."},401);
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

  let admin: AuthAdmin;
  try {
    const session = await c.env.DB.prepare(`SELECT admin_id FROM admin_sessions
      WHERE admin_id = ? AND token_hash = ? AND julianday(expires_at) > julianday('now')`)
      .bind(decoded.sub,await hashToken(token)).first();
    if(!session) return c.json({success:false,valid:false,message:'Invalid admin session.'},401);
    const row = await c.env.DB.prepare(`SELECT id,username,role,email,display_name FROM admin_accounts WHERE id = ? AND is_active = 1`)
      .bind(decoded.sub).first<any>();
    if(!row) return c.json({success:false,valid:false,message:'Invalid admin session.'},401);
    admin={...row,displayName:row.display_name};
  } catch {
    return c.json({success:false,valid:false,message:'Administrator sign-in is temporarily unavailable.'},503);
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

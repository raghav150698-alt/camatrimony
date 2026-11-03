/**
 * Admin session token generation and validation using HMAC-SHA256.
 * Fully Edge-compatible using Web Crypto APIs.
 */

const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface AdminTokenPayload {
  userId: string;
  role: string;
  email: string | null;
  exp: number;
}

/**
 * Gets the admin session secret from environment.
 */
function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or JWT_SECRET must be configured");
  }
  return secret;
}

/**
 * Converts an ArrayBuffer to a hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates an HMAC-SHA256 signature for the given data using the admin secret.
 */
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bufferToHex(signature);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Generates an admin session token for a given user.
 * The token is a base64url-encoded JSON payload + HMAC signature.
 */
export async function generateAdminToken(
  userId: string,
  role: string,
  email: string | null
): Promise<string> {
  const payload: AdminTokenPayload = {
    userId,
    role,
    email,
    exp: Date.now() + TOKEN_TTL,
  };

  const payloadJson = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const payloadB64 = base64UrlEncode(encoder.encode(payloadJson));
  const secret = getAdminSecret();
  const signature = await hmacSign(payloadB64, secret);

  return `${payloadB64}.${signature}`;
}

/**
 * Validates an admin session token and returns the payload if valid.
 * Returns null if the token is invalid, tampered with, or expired.
 */
export async function validateAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const secret = getAdminSecret();
    const expectedSignature = await hmacSign(payloadB64, secret);

    if (signature !== expectedSignature) {
      console.error("Admin token signature mismatch");
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as AdminTokenPayload;

    if (payload.exp < Date.now()) {
      console.error("Admin token expired");
      return null;
    }

    return payload;
  } catch (err) {
    console.error("Admin token validation error:", err);
    return null;
  }
}

/**
 * Extracts the admin token from an Authorization header or cookie.
 */
export function extractAdminToken(authHeader: string | null, cookies?: string | null): string | null {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  if (cookies) {
    const match = cookies.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

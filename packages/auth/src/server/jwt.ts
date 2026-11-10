/**
 * Firebase JWT verification using Web Crypto + Google JWKS.
 * Fully Edge-compatible (no Node.js dependencies).
 */

interface JwtHeader {
  alg: string;
  kid: string;
  typ: string;
}

interface JwtPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface JwkKey {
  kty: string;
  kid: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

// In-memory JWKS cache
let jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/**
 * Fetches Google's public JWKS keys with in-memory caching.
 */
async function getJwks(): Promise<JwkKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: ${res.status}`);
  }

  const data = (await res.json()) as { keys?: JwkKey[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  if (keys.length === 0) {
    throw new Error("JWKS response contained no keys");
  }

  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

/**
 * Converts a base64url string to an ArrayBuffer.
 */
function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Imports a JWK key as a CryptoKey for signature verification.
 */
async function importJwkKey(jwk: JwkKey): Promise<CryptoKey> {
  // RSA public key in JWK format
  const keyData = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    alg: jwk.alg,
    kid: jwk.kid,
    use: jwk.use,
  };

  return crypto.subtle.importKey(
    "jwk",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verifies a Firebase JWT token using Web Crypto.
 * Validates signature, iss, aud, and exp claims.
 *
 * @param token - The Firebase JWT token to verify
 * @param projectId - The Firebase project ID (used for iss/aud validation)
 * @returns The decoded JWT payload if valid, null otherwise
 */
export async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header and payload
    const header = JSON.parse(
      new TextDecoder().decode(base64UrlToBuffer(headerB64))
    ) as JwtHeader;
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBuffer(payloadB64))
    ) as JwtPayload;

    // Validate claims
    const expectedIss = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIss) {
      console.error("JWT iss claim mismatch:", payload.iss, "expected:", expectedIss);
      return null;
    }

    if (payload.aud !== projectId) {
      console.error("JWT aud claim mismatch:", payload.aud, "expected:", projectId);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== "RS256" || !header.kid || !payload.sub || !Number.isFinite(payload.exp) || !Number.isFinite(payload.iat) || payload.iat > now + 60 || payload.exp <= now) {
      console.error("JWT token expired");
      return null;
    }

    // Fetch JWKS and find matching key
    const jwks = await getJwks();
    const matchingKey = jwks.find((k) => k.kid === header.kid);
    if (!matchingKey) {
      console.error("No matching JWKS key found for kid:", header.kid);
      return null;
    }

    // Import key and verify signature
    const cryptoKey = await importJwkKey(matchingKey);
    const signature = base64UrlToBuffer(signatureB64);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      signedData
    );

    if (!isValid) {
      console.error("JWT signature verification failed");
      return null;
    }

    return payload;
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}

/**
 * Extracts the user ID from a Firebase JWT without full verification.
 * Use this only for lightweight edge routing, not for security decisions.
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBuffer(parts[1]))
    ) as JwtPayload;
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}

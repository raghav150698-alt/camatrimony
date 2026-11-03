/**
 * Edge-compatible password hashing using Web Crypto PBKDF2.
 * No Node.js dependencies; works in Cloudflare Workers.
 */

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const ALGORITHM = "SHA-256";

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash a plaintext password. Returns a string in the format:
 *   pbkdf2:<base64(salt)>:<base64(hash)>
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: ALGORITHM },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return `pbkdf2:${bufferToBase64(salt.buffer)}:${bufferToBase64(hashBuffer)}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith("pbkdf2:")) {
    return false;
  }
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;

  const salt = base64ToBuffer(parts[1]);
  const expectedHash = parts[2];

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: ALGORITHM },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const actualHash = bufferToBase64(hashBuffer);
  return actualHash === expectedHash;
}

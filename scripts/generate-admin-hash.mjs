/**
 * Generate a PBKDF2 password hash for the initial admin account.
 * Usage: node scripts/generate-admin-hash.mjs <password>
 */

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const ALGORITHM = "SHA-256";

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hashPassword(password) {
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

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/generate-admin-hash.mjs <password>");
  process.exit(1);
}

hashPassword(password).then((hash) => {
  console.log(hash);
});

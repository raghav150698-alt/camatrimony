/**
 * Bootstrap the first admin account for CA Matrimony BNCN.
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs <username> <password> [email] [displayName]
 *
 * Example:
 *   node scripts/bootstrap-admin.mjs admin 'Str0ng!Pass' admin@camatrimonybncn.com 'Super Administrator'
 *
 * Then copy the printed SQL and run it against D1:
 *   wrangler d1 execute camatrimony-db --remote --command="<SQL>"
 * Or save to a file and run:
 *   wrangler d1 execute camatrimony-db --remote --file=./scripts/bootstrap-admin.sql
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

function escapeSql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
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

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];
  const email = process.argv[4] || `${username}@camatrimonybncn.com`;
  const displayName = process.argv[5] || "Administrator";

  if (!username || !password) {
    console.error("Usage: node scripts/bootstrap-admin.mjs <username> <password> [email] [displayName]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const id = `admin-${crypto.randomUUID()}`;
  const hash = await hashPassword(password);

  const sql = `INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, display_name, email, role, is_active, created_at)
VALUES (${escapeSql(id)}, ${escapeSql(username)}, ${escapeSql(hash)}, ${escapeSql(displayName)}, ${escapeSql(email)}, 'super_admin', 1, datetime('now'));

UPDATE admin_accounts SET password_hash = ${escapeSql(hash)}, is_active = 1 WHERE username = ${escapeSql(username)};`;

  console.log(sql);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

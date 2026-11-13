# Admin access

The live portal is https://admin.camatrimonybncn.com/login. Production currently uses the dedicated administrator login, with username `admin`. The associated inbox is `admin@camatrimonybncn.com`; entering that email instead of the username is not supported by the current provider.

## Owner-operated password recovery

From the repository root, with the authorized Cloudflare Wrangler CLI session:

```powershell
node scripts/setup-admin-password.mjs
```

Open the generated local URL and enter and submit the new password yourself. It accepts one successful change, expires after 20 minutes, and binds only to `127.0.0.1`. Never send the password in chat. No password reset endpoint is deployed publicly.

The helper checks the exact active account and session-revocation trigger before presenting the form. Only a salted PBKDF2 hash is sent through Wrangler to D1. The temporary SQL file containing the hash is removed afterward. Changing this account's password revokes its existing dedicated admin sessions atomically through migration `0016_admin_password_sessions.sql`.

## November 13 release

The cream and maroon sign-in design is deployed to the existing admin Worker. Desktop and mobile layouts were reviewed. Cloudflare version: `e11466a9-b20e-48be-9b50-6067ef74463a`.

Migration 0016 was applied after recording a D1 recovery bookmark privately. Deploying the migration does not itself change the password. Password recovery remains pending until the owner submits the local form and sees its success confirmation.

Validation: admin production build and Worker dry run passed; 36 isolated API integration checks and 4 local recovery checks passed. Recovery checks cover compatibility with the actual Worker verifier, invalid requests, single-use/concurrent requests and expiry.

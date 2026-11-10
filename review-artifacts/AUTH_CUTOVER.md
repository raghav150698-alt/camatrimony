# Cloudflare + Supabase Auth cutover

Target: Cloudflare D1, R2 and Hono API; Supabase handles member and administrator authentication only. No product tables or files move to Supabase.

## Before switching authentication

1. Client Supabase project: `ulwijnfaktabzhhvuvyv`. Enable Google with the client's OAuth credentials and callback `https://ulwijnfaktabzhhvuvyv.supabase.co/auth/v1/callback`. Configure SMS provider for phone OTP. Keep anonymous sign-in disabled and email confirmation enabled.
2. Supabase URL configuration: set the live website as Site URL and allow the exact website `/login` redirect, localhost `/login`, and the specific staging URL. Avoid broad production redirect wildcards. The browser client uses PKCE and restores only validated internal destinations.
3. Back up D1 and obtain trusted Firebase Authentication user exports. Import/create corresponding users in Supabase Auth; verify Google/phone account linking. Export the Supabase auth user IDs and confirmed identities. Do not join members by editable profile email or user_metadata.
4. Generate an offline mapping with `node scripts/plan-auth-links.mjs <firebase-auth-export> <supabase-auth-export> private-migration/auth-links.sql`. Review unmatched/duplicate identities and D1 rows. An unmatched existing account is deliberately blocked from automatic email-based takeover; resolve its link before cutover.
5. Apply D1 migrations 0013–0015 after checking live schema/migration history and backups. Test on an isolated copy first. The planner's private output is never committed.
6. Explicitly provision administrators in Supabase Auth. Set the corresponding existing `admin_accounts.supabase_subject` to the verified auth UUID. Active account status and existing D1 role remain authoritative. A matching email or metadata role does not grant admin access. Test super-admin and restricted accounts before switching.
7. API environment: `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. Store a dedicated random `MEDIA_SIGNING_SECRET` and retain the existing admin secret during transition. Never use a service-role/secret key in public frontend variables.
8. Web AND admin build environment: `NEXT_PUBLIC_AUTH_PROVIDER=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, correct Workers API URL. Disable client-preview/local-review flags in production. Restart/rebuild both apps after changing public variables.

The tracked API config intentionally retains Firebase until the above checks succeed. The legacy administrator password endpoint rejects login when the API is switched to Supabase. Supabase access tokens are validated against the configured project's auth server. D1 lookup failures deny access.

## Credits

Existing package allowances are preserved. One newly unlocked contact costs one credit; repeated access is free. Unused credits are unavailable after expiry. Start/end comparisons use normalized SQLite dates. Future plans cannot spend early. The unlock, debit and ledger entry are one transaction. Existing balances are recorded as opening balances without inventing past usage. Plan assignment is transactional; retiring a plan preserves paid history. Scheduled replacement does not cancel an already active membership early.

## Production verification

Verify two real test members: new signup, existing-member link, refresh/logout, profile creation/editing, ID/certificate upload, full biodata without contacts, privacy, recommendation preferences, interest/accept, chat/block, and owned document downloads. Check an active, expired, scheduled and exhausted plan, repeated/concurrent unlocks, administrator cancellation/extension and ledger history. Verify R2 public bucket/custom-domain access cannot bypass private document/photo controls; any existing public access requires a separate bucket access review.

Payment provider integration and end-to-end payment verification remain a separate final step. Do not claim billing or recurring charges work before those checks. No such rollout notes belong in customer pages.

## Rollback

Take a pre-cutover D1 export and record Worker/website/admin deployment versions. Roll back app versions and auth-provider environment together if login verification fails. Migrations are additive; retain new tables/columns and the mapping for investigation. Do not delete live data or seed fixtures remotely.

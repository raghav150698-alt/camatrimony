# Launch review — 10 November 2026

Status: implementation and local review are ready for client testing. Production cutover remains pending verified authentication configuration, existing-user migration and deployment access. No live D1/R2 records or production deployments were changed.

## Implemented

- Cloudflare D1, R2 and Hono remain the data, storage and API stack. Supabase Auth support covers member Google/phone sign-in and administrator email/password sessions. PKCE, session refresh, validated internal redirects and stable D1 identity mapping preserve existing member relationships.
- Authentication fails closed when the auth provider or D1 is unavailable. Anonymous identities and production mock tokens are rejected. Staff permissions come from explicit D1 assignments; user-editable metadata cannot grant access. Legacy admin sessions now require a live token-specific session record.
- Membership credits: atomic contact unlock/debit/ledger writes, no duplicate charge, no spending before the start date or after expiry, exhausted-plan handling, and zero charge for hidden/blocked/unavailable contacts. Existing balances receive an opening ledger entry. The redesigned membership page displays available credits, dates and history.
- Administrator assignment is transactional. Expired/scheduled status is calculated consistently. Invalid/fractional periods are rejected; cancelled plans cannot be revived through extension. Retiring packages preserves membership/payment records. Manual approval does not mark KYC verified.
- Profile detail normalization and complete biodata viewing remain in place. Contacts and verification documents are excluded from other members' biodata. The document/photo editor uses separate controls and readable filenames, including its mobile layout.
- Saved profiles/interests respect privacy and blocks. Duplicate interests no longer reset accepted connections. Chat checks recipient availability and blocks, and the profile now offers chat after an accepted interest or contact unlock.
- Private uploads use no-store headers and exact ownership checks. Member/premium photos use scoped, expiring links with server-side privacy checks. Pending/rejected photos remain private to their owner/review staff. Document replacement invalidates its earlier verification approval.
- New profile media references must belong to that member. Age and custom degree validation remain enforced. No gateway rollout/configuration notes are shown in customer checkout/pricing copy.
- Replaced the incompatible legacy frontend deployment adapter with OpenNext for Cloudflare Workers, preserving Next.js. A Linux validation script and cutover runbook are included.

## Verification

- 49 regression checks pass: 19 shared tests and 30 API integration groups using an isolated SQLite database and mocked Supabase authority. No real user records or actual messages/payments are used by these tests.
- Integration coverage includes concurrent last-credit requests, duplicate unlocks, forced ledger failure rollback, scheduled/expired plans, hidden contacts, account bans, auth outages, existing-identity collisions, photo URL tampering, document replacement and administrator grant/revocation.
- Customer and admin production builds, Cloudflare bundles and dry-run packaging pass on Linux. API TypeScript checks pass. Compressed Worker code is approximately 2.26 MiB (web) and 1.05 MiB (admin).
- Packaged website Worker runtime returned HTTP 200 for home, about, memberships, login, profile, my-plan, robots and sitemap. Private-page noindex metadata was checked. This does not replace real OAuth/OTP or production load testing.
- SEO checks pass for 10 public pages and 17 private routes, structured data, canonical URLs, robots, sitemap and preview image.
- Full dependency audit (including new build tools): 0 critical/high/moderate/low findings after patches. This is an advisory check, not a guarantee of application security.
- Browser review opened a complete fictional profile successfully, unlocked one contact, observed 30 → 29 credits, reopened that contact without another charge, and reviewed the media editor at desktop and 390px mobile width.

## Required for live cutover

1. Finish Google OAuth and phone provider configuration in the client's Supabase project. Configure exact redirect URLs and obtain the publishable project key. Real Google/OTP and refresh/logout checks are still pending.
2. Obtain trusted Firebase Auth exports and link/create the corresponding Supabase users. Review all existing member mappings before switching providers. Provision/verify the first administrator explicitly. See AUTH_CUTOVER.md.
3. Authorize deployment access to the correct Cloudflare account. The signed-in browser works, but Wrangler currently has no authenticated deployment session. Back up D1, inspect remote migration/schema history, then apply only required migrations (including 0013–0015). Never apply fixture seeds remotely.
4. Verify that the R2 bucket's public domains cannot bypass private-file controls. Review existing upload ownership and legacy keys before release. Retain backups and a rollback deployment.
5. Deploy API, web and admin with matching provider settings and production preview flags disabled. Verify current domains, CORS, error reporting, delivery credentials and two real authorized test members.
6. Final payment-provider integration remains pending. Cashfree sandbox can be used for test transactions; approval of hire.valases.com does not establish approval of the client's matrimony domain/business/settlement account. Do not enable real checkout before its server/webhook verification tests pass.

## Hosting ownership findings

- The signed-in client Hostinger account has no listed hosting subscriptions, websites or domains.
- Public registration records identify Hostinger Operations, UAB as registrar for camatrimonybncn.com. Nameservers are Cloudflare; this alone does not reveal the website's origin host.
- A domain-registration/Domain Shield promotional email is not evidence of a hosting-plan purchase. The original recipient address, invoice or owning account is needed to resolve Hostinger access. No new plan or domain add-on was purchased.

Current live services were inspected read-only. Local demo account credits are fictional; production balances were not changed.

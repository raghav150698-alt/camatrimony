# Launch review — 11 November 2026

Status: production API, website and administrator application are deployed on Cloudflare. Firebase remains the active authentication provider; Supabase migration is not activated because Google credentials/provider setup and trusted existing-account mappings remain pending. Subscription enquiries use email; no gateway setup notices are shown to customers.

## Production release

- Backed up the live D1 database privately, rehearsed migrations against that export, then applied migrations 0012–0015. All 407 members and 65 subscriptions remain. Opening ledger balances match all 11,057 stored credits; foreign-key checks pass. These stored credits include historical plans, not only currently spendable credits.
- Confirmed the existing R2 bucket has no public custom domain and its public development URL is disabled. Existing 284 document paths and 357 photo paths match their owners. No real identity document was downloaded for testing.
- Preserved the existing RateLimiterDO SQLite class, counters schema and namespace binding recovered from the deployed Worker. Restored limits for administrator login, contact submissions, reports and broadcasts. Limits use trusted Cloudflare IP headers and separate endpoint keys. Configured limiter failures return a retryable error.
- Deployed the updated Hono API with contact-only subscription mode, existing Firebase configuration, existing D1/R2 bindings and a separate media-signing secret. Existing secrets were preserved.
- Web and admin now run as OpenNext Workers behind the existing client domains. The previous Pages deployments remain available for rollback; no DNS nameservers or hosting purchases changed.
- Public subscription selection shows the actual selected plan and a mailto enquiry. New checkout/manual-proof submissions are rejected in contact mode. Old payment-result URLs redirect to membership pages instead of inventing payment/activation results.
- Live checks passed for home, about, plans, subscription, login, profile/my-plan shells, robots, sitemap, social image and administrator login. Live settings confirm contact mode, and mock authentication plus anonymous access to a fictional private-document path are rejected. Real Google/SMS, member interaction and administrator workflows still require authorized account testing.
- Verification now includes 19 shared checks and 34 isolated API integration groups, including concurrent limiter requests, expiry, trusted-IP handling and outages. Web/admin Cloudflare production builds and website SEO checks passed.
- Report history no longer includes the reported member's email. Live empty-contact validation returned 400 after invoking the limiter, without creating a submission or sending a message.
- Release versions: API `4fa20ad4-96dd-4c00-9251-508ac9785f35`; web `ead3c610-993d-4c3e-abbb-eb47a4911155`; admin `5eaf3302-dc4e-43e7-ac6d-41fe27bfc9b7`. The prior API source and deployment history are saved privately for rollback. Removing the new web/admin Worker routes restores the retained Pages origins.

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

- 53 regression checks pass: 19 shared tests and 34 API integration groups using an isolated SQLite database and mocked Supabase authority. No real user records or actual messages/payments are used by these tests.
- Integration coverage includes concurrent last-credit requests, duplicate unlocks, forced ledger failure rollback, scheduled/expired plans, hidden contacts, account bans, auth outages, existing-identity collisions, photo URL tampering, document replacement and administrator grant/revocation.
- Customer and admin production builds, Cloudflare bundles and dry-run packaging pass on Linux. API TypeScript checks pass. Compressed Worker code is approximately 2.26 MiB (web) and 1.05 MiB (admin).
- Packaged website Worker runtime returned HTTP 200 for home, about, memberships, login, profile, my-plan, robots and sitemap. Private-page noindex metadata was checked. This does not replace real OAuth/OTP or production load testing.
- SEO checks pass for 10 public pages and 17 private routes, structured data, canonical URLs, robots, sitemap and preview image.
- Full dependency audit (including new build tools): 0 critical/high/moderate/low findings after patches. This is an advisory check, not a guarantee of application security.
- Browser review opened a complete fictional profile successfully, unlocked one contact, observed 30 → 29 credits, reopened that contact without another charge, and reviewed the media editor at desktop and 390px mobile width.

## Remaining authentication cutover and account checks

1. Finish Google OAuth and phone provider configuration in the client's Supabase project. Configure exact redirect URLs and obtain the publishable project key. Real Google/OTP and refresh/logout checks are still pending.
2. Obtain trusted Firebase Auth exports and link/create the corresponding Supabase users. Review all existing member mappings before switching providers. Provision/verify the first administrator explicitly. See AUTH_CUTOVER.md.
3. Deployment access was explicitly authorized, and migrations 0012–0015 have been applied after backup/rehearsal. Never apply fixture seeds remotely.
4. R2 public access and existing ownership paths have been reviewed. Retain backups and rollback deployments.
5. Production uses matching Firebase settings and has preview flags disabled. Complete two real authorized member sessions and administrator login/assignment checks before claiming all account workflows verified. Email delivery credentials exist, but delivery has not been tested with real recipients in this release.
6. Final payment-provider integration remains pending. Cashfree sandbox can be used for test transactions; approval of hire.valases.com does not establish approval of the client's matrimony domain/business/settlement account. Do not enable real checkout before its server/webhook verification tests pass.

## Hosting ownership findings

- The first Hostinger account used admin@camatrimonybncn.com and had no listed services. The original domain promotional email was addressed to camatrimonybncn@gmail.com; the client subsequently signed into the correct domain account.
- Public registration records identify Hostinger Operations, UAB as registrar for camatrimonybncn.com. Nameservers are Cloudflare; this alone does not reveal the website's origin host.
- Cloudflare contains the existing web/admin Pages projects, API Worker, D1 database and R2 bucket. The new web/admin release uses Workers. No new hosting plan or domain add-on was purchased.

Local demo accounts remain separate from production. Live migration opening entries preserve stored balances; no test contact credits were spent on real members.

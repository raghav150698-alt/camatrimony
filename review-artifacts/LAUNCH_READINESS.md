# Launch review — 5 November 2026

Status: code and client preview can be reviewed; production cutover is not yet verified.

## Completed

- Expanded qualification options across professional, undergraduate, postgraduate, medical, legal, design, teaching and diploma programmes. Other accepts a custom qualification, persists it as the actual degree, and restores it for editing.
- Shared validation enforces whole-year ages of 18–70 for women and 21–70 for men. Creation, editing, final wizard submission, preview saves and the real profile API apply the same rules. Changing gender revalidates age.
- Degree validation rejects a blank Other value and limits qualifications to 120 characters. No database migration is needed for these input changes.
- Fixed the admin subscription form reset that prevented the admin app from building.
- Updated Next.js to 16.4.5 and Hono to 4.13.16, including the auth package. Pinned patched transitive dependencies for the advisories found in the initial audit.
- Production dependency audit: 0 critical, 0 high, 0 moderate, 0 low. This is a dependency advisory check, not a complete security audit.
- Customer website and admin production builds pass; shared package builds and API TypeScript checks pass. API packaging dry-run passes.
- 19 unit regressions pass, including age boundaries, gender changes, custom degrees, matching and response normalization. Local API tests verified age enforcement and degree persistence and restored the synthetic account afterward.
- SEO checks pass for 10 public pages and 17 private routes.

## Live read-only checks

- Existing Workers API health: 200.
- Anonymous access to the self-profile endpoint: 401.
- CORS permits the current website origin.
- Current payment settings: Razorpay disabled; manual payments enabled. This does not verify a payment or manual approval transaction.
- api.camatrimonybncn.com did not resolve in DNS. The example web config and API media base now use the existing, verified camatrimony-api.gentle-mode-2ab9.workers.dev endpoint. Configure and verify the custom API domain before switching to it.

## Required before production cutover

1. Back up the live D1 database and check which of the existing 12 migrations are pending. Apply only required migrations; never apply review seeds remotely.
2. Configure real website/admin environment variables, Firebase domains and the production API URL. Disable client-preview and local-review flags. Verify the admin signing secret and email credentials in the platform secret store.
3. Exercise Google login and mobile OTP, complete a real new-profile flow, and verify document access and review with authorized test accounts.
4. Confirm the intended payment mode. Test manual payment submission and admin approval, or configure Razorpay credentials/webhook and test the full gateway flow before enabling it.
5. Exercise two-account interests, accepted messaging, blocks, contact unlocks and subscription credit handling against staging/production test accounts.
6. Deploy the updated API and website/admin through a validated production pipeline, then verify the custom domains, HTTPS, error reporting and database backups. The Vercel web build is validated; legacy next-on-pages scripts are not compatible with the current framework and must not be used for cutover.
7. Confirm production abuse controls/rate limits and monitoring. Submit the live sitemap to Search Console after the correct production deployment is active.

No live data was modified and no production API/database deployment was performed in this review.

Security references: [Next.js cache advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Next.js image advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw). The patches were selected from the package registry's advisory results.

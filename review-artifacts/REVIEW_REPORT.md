# Local review — 3 November 2026

Review at http://localhost:3000/. Choose **Continue as Arjun** on the login page for the fictional local account. API: http://localhost:8787/v1. Changes have not been deployed to the live site.

## Resolved

- Replaced overlapping document/photo URLs with filename cards, separate actions and photo thumbnails. Added upload feedback, private downloads, save validation and a mobile section selector. Uploaded documents are not described as verified until reviewed.
- Rebuilt the profile page with readable details, photo gallery, preference factors and working action states. Normalized legacy snake_case and current camelCase API fields, including missing values.
- The live browser error was `Cannot read properties of undefined (reading 'split')`. The deployed profile bundle calls `user_id.split(...)` although current responses can contain `userId`. The local fix normalizes both shapes and removes that assumption. The live deployment still contains the old code.
- Extended the cream/maroon design across member navigation and page headers; redesigned the homepage, authentication, about, how-it-works, plans, help, contact and community stories. Policy content is retained with shared styling. Mobile chat has a list/conversation switch.
- Preserved homepage search filters through login and onboarding. Personalized recommendations use saved age, community, education and minimum-income preferences.
- Fixed partial settings updates resetting privacy flags; notification preferences now map to actual API fields and feed behavior.
- Tightened profile visibility and contact-unlock checks. Unavailable profiles do not consume credits; unlocked contacts remain available after refresh. Private documents are excluded from public profile responses.
- Removed fabricated horoscope scores and testimonials. Community stories use featured CMS records. Subscription balances use API state rather than a default of 20 credits.
- Bundled licensed local fonts so the production build does not depend on Google font downloads.

## Validation

- Production web build, shared package builds, web/API TypeScript checks and API deployment dry-run passed. No deployment was performed.
- 14 unit tests passed for ranking, normalization and redirect handling.
- Local ranking integration tests passed for filtering, pagination, preferences, auth and shortlist behavior.
- Local profile integration tests passed for hidden/inactive/blocked profiles, credit preservation, partial settings, notification preferences, private uploads/downloads and public stories. Temporary QA fixtures were cleaned up.
- Browser checks covered local login, guest search through login, candidate profile, document download, two-photo validation, valid media save and desktop/mobile layouts.
- Twelve additional public/member routes were checked on mobile for expected headings, error boundaries and horizontal overflow; see `route-checks-mobile.json`.
- A separate reviewer inspected final rendered screenshots; see `UX_REVIEW_EXPANDED.md`.

## Remaining verification

Real Google/mobile OTP delivery, payment transactions and conversations between two real accounts were not exercised. Live production rollout and post-deployment checks remain pending. These checks do not establish that every possible issue is absent.

## Repeat the local profile regression

With the seeded local API running, apply `scripts/qa-local-setup.sql` using Wrangler D1 with `--local`, run `node scripts/profile-api.test.mjs`, then apply `scripts/qa-local-cleanup.sql` with `--local`. Never run review seeds or QA fixtures remotely. The test restores changed account settings.

See `LOCAL_REVIEW.md` for startup and dummy-auth configuration.

# CA Matrimony BNCN

Matrimony website and member app for CAs, CSs, CMAs and professionals.

- `apps/web`: Next.js customer website and member app.
- `apps/api`: Hono API on Cloudflare Workers, D1 database and R2 uploads.
- `apps/admin`: administration app.
- `packages`: shared matching, API client, authentication and UI.
- `migrations`: database schema migrations.

The member dashboard ranks profiles using saved age, community, income and education preferences. Signed-in profile pages expose available biodata independently of contact unlocks. Phone, email, street address and verification documents are excluded from member biodata responses. Existing income/photo privacy settings remain effective.

## Client preview on Vercel

Create a separate Vercel project with root directory `apps/web`, Node 24 and the build settings in `apps/web/vercel.json`. Workspace dependencies outside the root directory must be available.

Set these build variables **only on the review project**:

```text
NEXT_PUBLIC_CLIENT_PREVIEW=true
NEXT_PUBLIC_API_BASE_URL=/api/review
NEXT_PUBLIC_LOCAL_REVIEW=false
```

Choose **Continue as Arjun** on the login page. This build uses fictional profiles and browser-local state; it never calls the production API. Preferences, saved profiles and sample interests can be reviewed. Payments, contact unlocks, messaging, uploads and external submissions are disabled. Preview pages are noindex and the sitemap is empty. Stock portraits are illustrative.

For the real service, omit `NEXT_PUBLIC_CLIENT_PREVIEW`, use the production API URL and configure Firebase. The preview flag does not grant access to the Cloudflare API or real accounts.

## Local development

Use pnpm 10.28.2 and Node 24. Run `pnpm install --frozen-lockfile`, then `pnpm --filter './packages/*' build`.

See [LOCAL_REVIEW.md](LOCAL_REVIEW.md) for local API setup, migrations and the localhost-only dummy login. Never apply local review seeds to the live database.

## Validation

```sh
node --test scripts/matching.test.mjs
pnpm --filter @camatrimony/web build
node scripts/seo-check.mjs
pnpm --filter @camatrimony/api exec tsc --noEmit
```

API integration checks require the seeded local API; see the scripts and [review report](review-artifacts/REVIEW_REPORT.md). `member-profile.test.mjs` verifies complete signed-in biodata and withheld contact/documents on both lookup endpoints.

## Deployment

The Vercel review project does not deploy the Cloudflare API or change the live domain. Before production rollout, back up D1, review pending migrations, configure production secrets and exercise real authentication and payment flows.

API defaults are production-safe. Set local overrides in ignored `apps/api/.dev.vars`. Store `ADMIN_JWT_SECRET`, payment and email credentials in the platform secret store, never in Git. The existing Cloudflare web deployment script still requires modernization before production use.

# CA Matrimony BNCN codebase map

Initial inspection: 3 November 2026. Subsequent ranking and dashboard implementation is documented in `LOCAL_REVIEW.md`. Source review of the supplied ZIP archive; this is not a runtime or production audit.

## Project structure

This is a pnpm 10.28.2 workspace managed by Turborepo. The public website and member experience live in the same Next.js application; administration is a separate application.

| Location | Responsibility |
| --- | --- |
| `apps/web` | Public website and signed-in member app; Next.js 16.2.6, React 19.2.4, Tailwind CSS 4 |
| `apps/admin` | Separate Next.js admin application |
| `apps/api` | Hono API on Cloudflare Workers; entry point `src/index.ts`; routes under `/v1` |
| `packages/ui` | Shared buttons, inputs, cards, dialogs, tables, loading and empty states, toast messages, WhatsApp action |
| `packages/api-client` | API endpoint wrappers, Firebase bearer-token attachment, response normalization |
| `packages/shared` | Types, profile/search constants, package defaults, validation and media helpers |
| `packages/auth` | Firebase browser authentication, server token verification, admin auth and permissions |
| `packages/db` | D1 interfaces and development mock support |
| `packages/storage` | Cloudflare R2 upload and serving helpers |
| `packages/payments` | Razorpay server and browser checkout helpers |
| `packages/email` | Resend integration and email templates |
| `migrations` | SQL schema and incremental changes through `0012_kyc_doc_status.sql` |
| `scripts` | Local sample data and admin setup helpers |
| `md` | Requirements, scope, tech-stack and design documents |

## Customer journeys and implementation locations

1. Public discovery: `apps/web/src/app/page.tsx`, with shared navigation/footer in `src/components/layout`. Public pages include about, how it works, plans, success stories, contact, help and policy pages.
2. Sign-in/registration: `/login` and `/register` use Firebase Google sign-in and phone OTP. `src/context/AuthContext.tsx` loads the member profile and provides auth state and profile updates. Intended destinations are preserved through auth helpers.
3. Onboarding: `/onboarding` renders `src/components/registration/ProfileWizard.tsx`, a seven-step wizard with local draft persistence, personal/professional/family/preferences fields, and document/photo uploads.
4. Match discovery: `/dashboard` loads candidates, filters, sorting, pagination, favorites, interests and contact unlock information. Profile viewing and editing live under `/profile` and `/profile/edit`.
5. Connections: `/interests`, `/favorites`, `/chat`, `/notifications`. Chat calls API endpoints and polls messages every five seconds. API message permissions account for blocking, contact unlocks and accepted interests.
6. Membership: `/plans`, `/checkout`, `/my-plan`, `/payment/success`, `/payment/failure`. Plans use API data with local defaults. Checkout supports Razorpay and manual proof submission; available methods depend on server settings.
7. Service/account: `/support`, `/settings`, plus mediation and reporting actions in member flows.

## Data and services

- Firebase supplies member identity. The browser API client obtains the current ID token; API middleware verifies it.
- Admin authentication includes Firebase admin-role lookup and dedicated admin session tokens.
- Cloudflare D1 stores users, profiles, packages, subscriptions, payments, contact unlocks, interests, favorites, messages, notifications, reports, blocks, mediation requests, support tickets, photos, CMS settings and admin records.
- Cloudflare R2 stores uploaded media and documents.
- Contact unlocks require an active subscription and remaining contact balance. These rules live in API code and must remain intact during visual changes.
- Public website metadata identifies `camatrimonybncn.com`; admin configuration references `admin.camatrimonybncn.com`. The default API client URL is a Cloudflare Worker address. These are source configuration values, not confirmation of current deployed infrastructure.
- Wrangler configuration targets Cloudflare Workers for the API and Cloudflare Pages for the web/admin apps. Build/deployment commands are declared in the package files.

## Design implementation

- `apps/web/src/app/globals.css`: Tailwind theme, maroon/gold colors, animation utilities, dark-mode styling and reduced-motion support.
- `apps/web/src/app/layout.tsx`: fonts (Plus Jakarta Sans and Inter), metadata and auth provider.
- `apps/web/src/components/layout/{Layout,Navbar,Footer}.tsx`: shared customer page shell.
- `packages/ui/src`: shared visual primitives used across applications; changes here can affect both web and admin.
- Page-specific layout is largely inline Tailwind markup. Dashboard and onboarding are especially large components with both UI and state/flow logic.
- The written design document specifies indigo/amber, while the implemented customer theme uses maroon/gold. Establish one agreed visual direction before applying broad style changes.

## Findings relevant to upcoming changes

- There is substantial existing functionality to preserve. A visual refresh can build on the current applications and shared packages.
- Signed-in top navigation lists many destinations. Mobile and desktop information hierarchy merit a dedicated review.
- Homepage plans are hardcoded, while `/plans` uses API packages with defaults; changes to membership presentation need consistency across both surfaces.
- The homepage featured-profile array is currently empty. The redesign should explicitly decide how that section gets populated or handles its empty state.
- `UX_AUDIT_REPORT.md` and `REBUILD_PLAN.md` contain historical information. In particular, the audit's missing-checkout and fake-chat claims do not describe this snapshot. Revalidate each finding against current code.
- `README.md` is still a generic Next.js starter and does not explain the actual workspace.
- No automated test/spec files were found in the source inventory. The root test command delegates to workspace tasks, but the three application manifests do not define test scripts.
- Local frontend requests default to the configured hosted API unless `NEXT_PUBLIC_API_BASE_URL` is explicitly overridden. Set local endpoints before exercising write flows.
- API Wrangler defaults include development mode and a development admin signing value. Production environment/secret overrides were not supplied or verified.

## Local verification status

The archive was extracted into `source/camatrimony-main-2`; application source was not changed. No dependencies or `.git` history were included in the extracted project root. Node is available. The pnpm version check attempted to provision the pinned version and failed with a local permission error, so no build, lint, browser walkthrough or end-to-end test has been completed.

The repository's `AGENTS.md` requires reading the relevant bundled Next.js guides under `node_modules/next/dist/docs/` before writing application code. Those guides will be available after dependencies are installed.

## Suggested implementation sequence

Start with the public homepage and shared customer navigation/footer to establish the approved visual direction. Then apply it to registration/onboarding, match cards and search, profile details, interests/chat, and membership checkout. Review the admin experience separately. Validate responsive layouts and the auth, upload, contact-unlock and payment flows as their screens change.

# Architecture Rebuild Plan — CA Matrimony BNCN

**Date:** 2026-07-06
**Goal:** Split the single Next.js app into 3 independent Cloudflare deployments with a shared monorepo, and fix all critical UX issues from the audit report.

---

## Table of Contents

1. [Target Architecture Overview](#1-target-architecture-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Shared Packages](#3-shared-packages)
4. [Package Build Strategy](#31-package-build-strategy)
5. [API Worker (api.camatrimonybncn.com)](#4-api-worker-apicamatrimonybncncom)
6. [Web App (camatrimonybncn.com)](#5-web-app-camatrimonybncncom)
7. [Admin App (admin.camatrimonybncn.com)](#6-admin-app-admincamatrimonybncncom)
8. [Database Migrations](#7-database-migrations)
9. [Domain & DNS Setup](#8-domain--dns-setup)
10. [Environment Variables](#9-environment-variables)
11. [UX Fixes Bundled Into This Rebuild](#10-ux-fixes-bundled-into-this-rebuild)
12. [Missing Screens to Build](#11-missing-screens-to-build)
13. [Missing API Endpoints to Build](#12-missing-api-endpoints-to-build)
14. [Security Fixes](#13-security-fixes)
15. [Migration Steps (Current → New)](#14-migration-steps-current--new)
16. [Production Cutover & Rollback Strategy](#141-production-cutover--rollback-strategy)
17. [Build & Deploy Commands](#15-build--deploy-commands)
18. [Testing Strategy](#16-testing-strategy)
19. [Direct Production Rollout Checklist](#17-direct-production-rollout-checklist)

---

## 1. Target Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │       Cloudflare DNS / Routing       │
                    └──────┬──────────┬─────────────┬──────┘
                           │          │             │
            ┌──────────────▼──┐  ┌────▼─────────┐  ┌▼──────────────┐
            │  camatrimonybncn │  │ admin.cama.. │  │  api.cama..   │
            │     .com         │  │    .com      │  │    .com       │
            │                  │  │              │  │               │
            │  apps/web        │  │  apps/admin  │  │  apps/api     │
            │  Next.js Pages   │  │  Next.js     │  │  Hono Worker  │
            │                  │  │  Pages       │  │               │
            │  User-facing     │  │  Admin panel │  │  All REST API │
            └────────┬─────────┘  └──────┬───────┘  └───┬───────────┘
                     │                   │              │
                     │    fetch()        │  fetch()     │ direct binding
                     └───────────────────┴──────────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          │               │               │
                    ┌─────▼─────┐  ┌──────▼──────┐  ┌────▼─────┐
                    │  D1 (DB)  │  │  R2 (Bucket)│  │ Firebase │
                    │           │  │             │  │  Auth    │
                    └───────────┘  └─────────────┘  └──────────┘
```

| Subdomain | App | Runtime | Cloudflare Product |
|---|---|---|---|
| `camatrimonybncn.com` | `apps/web` | Next.js 16 (edge) | Pages |
| `admin.camatrimonybncn.com` | `apps/admin` | Next.js 16 (edge) | Pages |
| `api.camatrimonybncn.com` | `apps/api` | Hono on Workers | Workers |

**Key principles:**
- Web and Admin are **pure frontend** — no API routes. They call `api.camatrimonybncn.com` via `fetch()`.
- API Worker owns **all D1/R2 bindings** and all business logic.
- Shared code lives in `packages/*` — imported by all apps.
- Each app deploys independently via its own `wrangler` config.
- Firebase Auth runs client-side in web/admin; API verifies Firebase JWTs server-side.

---

## 2. Monorepo Structure

```
camatrimony/
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition (required)
├── turbo.json                      # Turborepo pipeline (required for builds)
├── .gitignore
├── README.md
├── AGENTS.md
├── CLAUDE.md
│
├── packages/
│   ├── shared/                     # @camatrimony/shared
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/              # Shared TypeScript types
│   │       │   ├── user.ts         # DBUserProfile, AuthUser, AdminRole
│   │       │   ├── profile.ts      # Profile, CandidateProfile
│   │       │   ├── payment.ts      # Package, Payment, Subscription
│   │       │   ├── interest.ts     # InterestRequest
│   │       │   ├── notification.ts
│   │       │   ├── chat.ts         # Message
│   │       │   ├── mediation.ts
│   │       │   ├── report.ts
│   │       │   ├── support.ts      # SupportTicket
│   │       │   └── api.ts          # ApiResponse<T>, PaginatedResponse<T>
│   │       ├── constants/          # Shared constants
│   │       │   ├── permissions.ts  # RBAC permission matrix
│   │       │   ├── packages.ts     # Default package definitions
│   │       │   └── config.ts       # API_BASE_URL, etc.
│   │       └── utils/              # Pure utility functions
│   │           ├── validation.ts   # Phone/email validators
│   │           ├── astrology.ts    # Compatibility scoring
│   │           └── format.ts       # Date/currency formatters
│   │
│   ├── db/                         # @camatrimony/db
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── d1-types.ts         # D1Database, D1PreparedStatement interfaces
│   │       ├── schema.ts           # Table definitions as TS types
│   │       ├── mock.ts             # MockD1Database (dev/build only)
│   │       └── client.ts           # getDB() factory
│   │
│   ├── api-client/                 # @camatrimony/api-client
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts           # Typed fetch wrapper → api.camatrimonybncn.com
│   │       ├── auth.ts             # Firebase token attachment helper
│   │       └── endpoints/          # Typed endpoint functions
│   │           ├── profile.ts
│   │           ├── profiles.ts
│   │           ├── interests.ts
│   │           ├── chat.ts
│   │           ├── payments.ts
│   │           ├── favorites.ts
│   │           ├── notifications.ts
│   │           ├── unlocks.ts
│   │           ├── block.ts
│   │           ├── mediation.ts
│   │           ├── reports.ts      # NEW
│   │           ├── support.ts      # NEW
│   │           └── uploads.ts
│   │
│   ├── auth/                       # @camatrimony/auth
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── firebase.ts         # Firebase init (client-side, for web/admin)
│   │       ├── jwt.ts              # Firebase JWT verification (server-side, for API)
│   │       ├── admin-auth.ts       # Admin session token gen/validate (for API)
│   │       └── rbac.ts             # requireAuth, requireAdmin, requireSuperAdmin, checkPermission
│   │
│   ├── payments/                   # @camatrimony/payments
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── razorpay.ts         # createOrder, verifySignature, processRefund, fetchPayment
│   │       └── checkout.ts         # Razorpay checkout SDK loader (client-side)
│   │
│   ├── email/                      # @camatrimony/email
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── resend.ts           # sendEmail via Resend API
│   │       └── templates.ts        # All HTML email templates
│   │
│   ├── storage/                    # @camatrimony/storage
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── r2-upload.ts        # uploadToR2, deleteFromR2, generateR2Key
│   │       └── r2-serve.ts         # Serve R2 objects with headers
│   │
│   └── ui/                         # @camatrimony/ui (shared components for web + admin)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── Button.tsx
│           ├── Input.tsx
│           ├── Select.tsx
│           ├── Textarea.tsx
│           ├── Modal.tsx
│           ├── Badge.tsx
│           ├── Avatar.tsx
│           ├── Card.tsx
│           ├── Tabs.tsx
│           ├── Toast.tsx
│           ├── Skeleton.tsx
│           ├── Switch.tsx
│           ├── Pagination.tsx
│           ├── DataTable.tsx
│           ├── DropdownMenu.tsx
│           ├── ConfirmDialog.tsx
│           ├── EmptyState.tsx
│           ├── FileUpload.tsx
│           ├── StatCard.tsx
│           ├── SectionHeading.tsx
│           ├── DateRangePicker.tsx
│           └── WhatsAppFAB.tsx
│
├── apps/
│   ├── web/                        # camatrimonybncn.com
│   │   ├── package.json
│   │   ├── wrangler.jsonc          # Pages config (no D1/R2 bindings)
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── postcss.config.mjs
│   │   ├── eslint.config.mjs
│   │   ├── public/
│   │   │   ├── logo.png
│   │   │   ├── success_story_1.png
│   │   │   └── success_story_2.png
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── globals.css
│   │       │   ├── page.tsx                 # Homepage
│   │       │   ├── about/page.tsx
│   │       │   ├── how-it-works/page.tsx
│   │       │   ├── plans/page.tsx           # FIXED: links to /checkout
│   │       │   ├── success-stories/page.tsx
│   │       │   ├── contact/page.tsx         # FIXED: real API submission
│   │       │   ├── privacy-policy/page.tsx
│   │       │   ├── terms-and-conditions/page.tsx
│   │       │   ├── refund-policy/page.tsx
│   │       │   ├── login/page.tsx
│   │       │   ├── register/page.tsx
│   │       │   ├── forgot-password/page.tsx # NEW
│   │       │   ├── onboarding/page.tsx      # FIXED: redirect → /dashboard
│   │       │   ├── dashboard/page.tsx       # FIXED: real contact info, unlock balance
│   │       │   ├── profile/page.tsx         # FIXED: real contact info, report/block
│   │       │   ├── profile/edit/page.tsx    # FIXED: real R2 upload
│   │       │   ├── chat/page.tsx            # FIXED: real API, ?id= param, polling
│   │       │   ├── favorites/page.tsx       # FIXED: empty state
│   │       │   ├── interests/page.tsx       # FIXED: empty states
│   │       │   ├── notifications/page.tsx   # FIXED: empty state, filters
│   │       │   ├── settings/page.tsx        # FIXED: real API saves
│   │       │   ├── checkout/page.tsx        # NEW: Razorpay payment flow
│   │       │   ├── payment/
│   │       │   │   ├── success/page.tsx     # NEW
│   │       │   │   └── failure/page.tsx     # NEW
│   │       │   ├── my-plan/page.tsx         # NEW: subscription management
│   │       │   ├── support/page.tsx         # NEW: support ticket system
│   │       │   └── help/page.tsx            # NEW: FAQ/help center
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── Navbar.tsx           # FIXED: logout, API base URL
│   │       │   │   ├── Footer.tsx           # FIXED: social links
│   │       │   │   └── Layout.tsx
│   │       │   └── registration/
│   │       │       └── ProfileWizard.tsx    # FIXED: R2 upload, redirect, progress save
│   │       ├── context/
│   │       │   └── AuthContext.tsx          # FIXED: API base URL config
│   │       └── middleware.ts                # Minimal (no admin routing needed)
│   │
│   ├── admin/                      # admin.camatrimonybncn.com
│   │   ├── package.json
│   │   ├── wrangler.jsonc          # Pages config (no D1/R2 bindings)
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── postcss.config.mjs
│   │   ├── eslint.config.mjs
│   │   ├── public/
│   │   │   └── logo.png
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx              # FIXED: logout button, session warning
│   │       │   ├── globals.css
│   │       │   ├── page.tsx                # Dashboard
│   │       │   ├── login/page.tsx          # FIXED: 2FA option, rate limit
│   │       │   ├── users/
│   │       │   │   ├── page.tsx            # FIXED: sort, full creation form
│   │       │   │   └── [id]/page.tsx       # FIXED: KYC endpoint, document viewer
│   │       │   ├── kyc/page.tsx            # FIXED: pagination, bulk, zoom/download
│   │       │   ├── subscriptions/page.tsx  # FIXED: package CRUD UI
│   │       │   ├── packages/page.tsx       # NEW: package management
│   │       │   ├── payments/page.tsx       # FIXED: partial refund, reason, date filter
│   │       │   ├── matches/page.tsx
│   │       │   ├── communication/page.tsx  # FIXED: template editor, preview
│   │       │   ├── moderation/page.tsx     # FIXED: content preview, bulk actions
│   │       │   ├── mediation/page.tsx      # FIXED: calendar picker
│   │       │   ├── cms/page.tsx            # FIXED: full CMS, logo upload
│   │       │   ├── audit/page.tsx          # FIXED: filters, export
│   │       │   ├── analytics/page.tsx      # FIXED: date range, charts
│   │       │   ├── photos/page.tsx         # NEW: photo approval queue
│   │       │   ├── settings/page.tsx       # FIXED: system config, admin profiles
│   │       │   └── support/page.tsx        # NEW: support ticket management
│   │       ├── components/
│   │       │   ├── AdminLayout.tsx         # Shared admin shell (sidebar, header, logout)
│   │       │   ├── AdminSidebar.tsx
│   │       │   └── AdminGuard.tsx          # Auth guard component
│   │       ├── context/
│   │       │   └── AdminAuthContext.tsx    # Admin session management
│   │       └── lib/
│   │           └── admin-api-client.ts     # Typed fetch → api.camatrimonybncn.com/admin/*
│   │
│   └── api/                        # api.camatrimonybncn.com
│       ├── package.json
│       ├── wrangler.jsonc          # Worker config (D1 + R2 bindings here)
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Hono app entry, CORS, route mounting
│           ├── middleware/
│           │   ├── auth.ts         # JWT verification, user extraction
│           │   ├── admin-auth.ts   # Admin token validation
│           │   ├── rbac.ts         # Permission check middleware
│           │   ├── cors.ts         # CORS for cross-origin frontend calls
│           │   └── error.ts        # Global error handler
│           └── routes/
│               ├── profile.ts      # GET/POST /v1/profile
│               ├── profiles.ts     # GET /v1/profiles, GET /v1/profiles/:id
│               ├── interests.ts    # GET/POST /v1/interests, PATCH/DELETE /v1/interests/:id
│               ├── chat.ts         # GET/POST /v1/chat, PATCH /v1/chat/:id/read
│               ├── favorites.ts    # GET/POST/DELETE /v1/favorites
│               ├── unlocks.ts      # GET/POST /v1/unlocks (FIXED: balance check + deduction)
│               ├── notifications.ts # GET/PATCH /v1/notifications
│               ├── block.ts        # GET/POST/DELETE /v1/block
│               ├── mediation.ts    # GET/POST /v1/mediation
│               ├── reports.ts      # NEW: POST/GET /v1/reports
│               ├── support.ts      # NEW: GET/POST /v1/support, POST /v1/support/:id/message
│               ├── uploads.ts      # GET/POST /v1/uploads (R2)
│               ├── payments.ts     # POST /v1/payments/create, POST /v1/payments/webhook
│               ├── contact.ts      # NEW: POST /v1/contact
│               ├── user-settings.ts # NEW: GET/PATCH /v1/user/settings
│               └── admin/
│                   ├── auth.ts         # POST /v1/admin/auth, GET /v1/admin/auth/validate
│                   ├── dashboard.ts    # GET /v1/admin/dashboard
│                   ├── users.ts        # GET/POST /v1/admin/users, GET/PATCH/DELETE /v1/admin/users/:id
│                   ├── kyc.ts          # NEW: GET/POST /v1/admin/kyc (approve/reject/request-docs)
│                   ├── packages.ts     # NEW: GET/POST/PATCH/DELETE /v1/admin/packages
│                   ├── subscriptions.ts # GET/POST/PATCH /v1/admin/subscriptions
│                   ├── payments.ts     # GET/POST /v1/admin/payments (FIXED: partial refund + reason)
│                   ├── matches.ts      # GET/POST /v1/admin/matches
│                   ├── moderation.ts   # GET/POST /v1/admin/moderation (FIXED: content preview)
│                   ├── mediation.ts    # GET/POST /v1/admin/mediation
│                   ├── photos.ts       # NEW: GET/POST /v1/admin/photos (approve/reject/delete/visibility)
│                   ├── cms.ts          # GET/POST /v1/admin/cms
│                   ├── audit.ts        # GET /v1/admin/audit (FIXED: filters)
│                   ├── roles.ts        # GET/POST /v1/admin/roles
│                   ├── email.ts        # POST /v1/admin/email
│                   ├── settings.ts     # NEW: GET/PATCH /v1/admin/settings
│                   ├── communication.ts # NEW: GET/POST /v1/admin/communication
│                   └── support.ts      # NEW: GET/PATCH /v1/admin/support
│
└── migrations/                     # Shared D1 migrations (applied to the single D1 DB)
    ├── 0001_init.sql               # Existing
    ├── 0002_chat_reports.sql       # Existing
    ├── 0003_enterprise_upgrade.sql # Existing
    ├── 0004_missing_tables.sql     # NEW: success_stories, admin_accounts, photos
    └── 0005_fixes.sql              # NEW: add contact_limit_balance, settings columns, etc.
```

---

## 3. Shared Packages

### `@camatrimony/shared`
- **Types**: All TypeScript interfaces (`DBUserProfile`, `AuthUser`, `Package`, `Payment`, `InterestRequest`, `Message`, `Notification`, `ApiResponse<T>`, `PaginatedResponse<T>`, etc.)
- **Constants**: RBAC permission matrix, default package definitions, API base URLs
- **Utils**: Phone/email validators, astrology compatibility scoring, date/currency formatters

### `@camatrimony/db`
- D1 type interfaces (`D1Database`, `D1PreparedStatement`)
- Table-to-TS schema mapping
- `MockD1Database` (dev/build only — never bundled in production Worker)
- `getDB(env)` factory — returns real D1 binding or mock

### `@camatrimony/api-client`
- Typed `fetch()` wrapper that calls `https://api.camatrimonybncn.com/v1/...`
- Automatically attaches Firebase JWT from client-side auth
- Typed endpoint functions: `getProfile()`, `searchProfiles()`, `expressInterest()`, `sendMessage()`, `createOrder()`, etc.
- Used by both `apps/web` and `apps/admin`

### `@camatrimony/auth`
**Split into subpath exports because the Firebase client SDK cannot run in a Worker.**

- `@camatrimony/auth/client`
  - `firebase.ts` — Firebase init (used by web/admin)
  - `googleProvider.ts` — Google OAuth provider
- `@camatrimony/auth/server`
  - `jwt.ts` — Firebase JWT verification with Web Crypto + Google JWKS caching
  - `admin-auth.ts` — Admin session token generation + validation with HMAC-SHA256
  - `rbac.ts` — `requireAuth`, `requireAdmin`, `requireSuperAdmin`, `checkPermission` as Hono middleware

### `@camatrimony/payments`
- `razorpay.ts` — `createOrder()`, `verifySignature()`, `processRefund()`, `fetchPayment()` (edge-compatible `fetch`)
- `checkout.ts` — Client-side Razorpay checkout SDK loader (used by web app)

### `@camatrimony/email`
- `resend.ts` — `sendEmail()` via Resend API
- `templates.ts` — All HTML email templates (welcome, kyc_approved, kyc_rejected, interest_received, interest_accepted, plan_expiring, payment_confirmed, refund_processed, account_suspended, admin_otp)

### `@camatrimony/storage`
- `r2-upload.ts` — `uploadToR2()`, `deleteFromR2()`, `generateR2Key()`
- `r2-serve.ts` — Serve R2 objects with proper headers

### `@camatrimony/ui`
- All shared UI components (Button, Input, Modal, DataTable, Toast, etc.)
- Imported by both `apps/web` and `apps/admin`
- Tailwind v4 compatible, uses shared design tokens (maroon/gold)

---

## 3.1 Package Build Strategy

### Tooling
- **Package manager:** `pnpm` (required)
- **Build orchestration:** `Turborepo` via `turbo.json`
- **Package builder:** `tsup` for most packages, `tsc` for pure-type packages

### How each package is built

| Package | Builder | Output | Notes |
|---|---|---|---|
| `@camatrimony/shared` | `tsc` | `dist/` | Pure TS types/constants/utils |
| `@camatrimony/db` | `tsup` | `dist/` | Must not bundle `MockD1Database` into API Worker production build |
| `@camatrimony/api-client` | `tsup` | `dist/` | Client-side fetch wrapper |
| `@camatrimony/auth` | `tsup` | `dist/` | **Split into subpath exports** `client` and `server` |
| `@camatrimony/payments` | `tsup` | `dist/` | Edge-compatible Razorpay logic |
| `@camatrimony/email` | `tsup` | `dist/` | Resend + templates |
| `@camatrimony/storage` | `tsup` | `dist/` | R2 helpers |
| `@camatrimony/ui` | `tsup` | `dist/` | React components with Tailwind classes |

### Package `exports` example
Each package must declare proper `exports` in `package.json`:

```json
{
  "name": "@camatrimony/auth",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/client.js",
    "./server": "./dist/server.js"
  },
  "scripts": {
    "build": "tsup src/index.ts src/client.ts src/server.ts --format esm --dts",
    "dev": "tsup src/index.ts src/client.ts src/server.ts --format esm --dts --watch"
  }
}
```

### Important: `@camatrimony/auth` split
The Firebase client SDK cannot run in a Cloudflare Worker. The auth package must expose:
- `@camatrimony/auth/client` — `firebase.ts`, `GoogleAuthProvider`, `signInWithPopup` (used by web + admin)
- `@camatrimony/auth/server` — `jwt.ts` (Firebase JWT verification), `admin-auth.ts`, `rbac.ts` (used by API Worker)

### Mock DB safety
`@camatrimony/db` exports `MockD1Database`. In production, the API Worker must import only `getDB(env)` and tree-shake out the mock. Do this by:
- Keeping mock in a separate file (`mock.ts`) not imported by `client.ts`
- Using `import.meta.env.PROD` or package conditional exports to exclude mock in production builds

---

## 4. API Worker (api.camatrimonybncn.com)

### Runtime
- **Hono** on Cloudflare Workers
- Direct D1 + R2 bindings (only the API has these)
- Edge-compatible (uses Web Crypto, native `fetch`, no Node.js APIs)

### `wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "camatrimony-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": [],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "camatrimony-db",
      "database_id": "7d423a72-50a0-4f0e-916b-2dd21ec1b6b5"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "camatrimony-uploads-bucket"
    }
  ],
  "vars": {
    "CORS_ORIGIN": "https://camatrimonybncn.com,https://admin.camatrimonybncn.com"
  }
}
```

**Secrets to set via `wrangler secret put`:**
```
FIREBASE_PROJECT_ID
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
ADMIN_JWT_SECRET
```

### Route Structure (Hono)

```
GET    /v1/profile                    # Get own profile
POST   /v1/profile                    # Create/update own profile
GET    /v1/profiles                   # Search catalog (filters, pagination)
GET    /v1/profiles/:id               # Get single profile by ID          [NEW]
GET    /v1/profiles/search-by-id      # Search by profile ID code          [NEW]

GET    /v1/interests                  # List sent/received interests
POST   /v1/interests                  # Express interest
PATCH  /v1/interests/:id              # Accept/decline interest
DELETE /v1/interests/:id              # Withdraw interest

GET    /v1/chat                       # List conversations
GET    /v1/chat/conversations        # List recent conversations (with last message + unread count) [NEW]
POST   /v1/chat                       # Send message
PATCH  /v1/chat/:id/read              # Mark message as read              [NEW]

GET    /v1/favorites                  # List favorites
POST   /v1/favorites                  # Add favorite
DELETE /v1/favorites                  # Remove favorite

GET    /v1/unlocks                    # List unlocked contacts
POST   /v1/unlocks                    # Unlock contact (FIXED: balance check + deduction + return real contact info)

GET    /v1/notifications              # List notifications
PATCH  /v1/notifications/:id          # Mark as read
PATCH  /v1/notifications              # Mark all as read

GET    /v1/block                      # List blocked users
POST   /v1/block                      # Block user
DELETE /v1/block                      # Unblock user

GET    /v1/mediation                  # List mediation requests
POST   /v1/mediation                  # Request mediation

POST   /v1/reports                    # Submit report                      [NEW]
GET    /v1/reports                    # List own reports                   [NEW]

GET    /v1/support                    # List support tickets               [NEW]
POST   /v1/support                    # Create support ticket              [NEW]
POST   /v1/support/:id/message        # Add message to ticket              [NEW]

GET    /v1/uploads?key=               # Serve R2 object
POST   /v1/uploads                    # Upload to R2

POST   /v1/payments/create            # Create Razorpay order
POST   /v1/payments/webhook           # Razorpay webhook (FIXED: signature verification)

POST   /v1/contact                    # Contact form submission            [NEW]

GET    /v1/user/settings              # Get user settings/privacy          [NEW]
PATCH  /v1/user/settings              # Save user settings/privacy         [NEW]

# Admin endpoints (all under /v1/admin, require admin auth + RBAC)
POST   /v1/admin/auth                 # Admin login
GET    /v1/admin/auth/validate        # Validate admin token (FIXED: server-side validation)

GET    /v1/admin/dashboard            # Dashboard metrics
GET    /v1/admin/users                # List users (FIXED: sort, more filters)
POST   /v1/admin/users                # Create user (FIXED: full field set)
GET    /v1/admin/users/:id            # User detail
PATCH  /v1/admin/users/:id            # Update user (ban/unban/verify/edit)
DELETE /v1/admin/users/:id            # Delete user

GET    /v1/admin/kyc                  # List KYC queue (FIXED: pagination, server-side filter)
POST   /v1/admin/kyc/:id/approve      # Approve KYC                        [NEW dedicated endpoint]
POST   /v1/admin/kyc/:id/reject       # Reject KYC with reason             [NEW dedicated endpoint]
POST   /v1/admin/kyc/:id/request-docs # Request additional documents       [NEW]

GET    /v1/admin/packages             # List packages                      [NEW]
POST   /v1/admin/packages             # Create package                     [NEW]
PATCH  /v1/admin/packages/:id         # Update package                     [NEW]
DELETE /v1/admin/packages/:id         # Delete/disable package             [NEW]

GET    /v1/admin/subscriptions        # List subscriptions
POST   /v1/admin/subscriptions        # Assign plan
PATCH  /v1/admin/subscriptions/:id    # Extend/cancel subscription

GET    /v1/admin/payments             # List payments (FIXED: date range filter)
POST   /v1/admin/payments/:id/refund  # Refund (FIXED: partial amount + reason)

GET    /v1/admin/matches              # Match suggestions
POST   /v1/admin/matches              # Suggest match

GET    /v1/admin/moderation           # List reports (FIXED: includes content preview)
POST   /v1/admin/moderation/:id       # Resolve report (strike/ban/warn)

GET    /v1/admin/mediation            # List mediation requests
POST   /v1/admin/mediation/:id        # Update mediation status

GET    /v1/admin/photos               # Photo approval queue               [NEW]
POST   /v1/admin/photos/:id/approve   # Approve photo                      [NEW]
POST   /v1/admin/photos/:id/reject    # Reject photo with reason           [NEW]
DELETE /v1/admin/photos/:id           # Delete photo                       [NEW]
PATCH  /v1/admin/photos/:id/visibility # Set photo visibility              [NEW]

GET    /v1/admin/cms                  # Get CMS settings + success stories
POST   /v1/admin/cms                  # Update CMS settings
POST   /v1/admin/cms/stories          # Add success story
PATCH  /v1/admin/cms/stories/:id      # Edit success story                 [NEW]
DELETE /v1/admin/cms/stories/:id      # Delete success story

GET    /v1/admin/audit                # Audit log (FIXED: date/action/admin filters, pagination)
GET    /v1/admin/roles                # List admin roles
POST   /v1/admin/roles                # Assign admin role

POST   /v1/admin/email                # Send broadcast email

GET    /v1/admin/settings             # Get system settings                [NEW]
PATCH  /v1/admin/settings             # Update system settings             [NEW]

GET    /v1/admin/communication        # Communication history              [NEW]
POST   /v1/admin/communication        # Send announcement                  [NEW]

GET    /v1/admin/support              # List support tickets               [NEW]
PATCH  /v1/admin/support/:id          # Update ticket status/assignment    [NEW]
```

### Hono App Entry (`src/index.ts`)
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { profileRoutes } from "./routes/profile";
import { adminRoutes } from "./routes/admin";
// ... all route imports

const app = new Hono<{ Bindings: { DB: D1Database; BUCKET: R2Bucket; CORS_ORIGIN: string } }>();

app.use("*", logger());
app.use("*", cors({
  origin: [
    "https://camatrimonybncn.com",
    "https://admin.camatrimonybncn.com",
    "http://localhost:3000",
    "http://localhost:3001"
  ],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  credentials: true
}));

app.route("/v1/profile", profileRoutes);
app.route("/v1/profiles", profilesRoutes);
app.route("/v1/interests", interestsRoutes);
app.route("/v1/chat", chatRoutes);
// ... mount all routes
app.route("/v1/admin", adminRoutes);

export default app;
```

---

## 5. Web App (camatrimonybncn.com)

### Runtime
- Next.js 16 on Cloudflare Pages
- **No API routes** — all data fetched from `api.camatrimonybncn.com` via `@camatrimony/api-client`
- **No D1/R2 bindings** — pure frontend

### `wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "camatrimony-web",
  "pages_build_output_dir": ".vercel/output/static",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": ["nodejs_compat"]
  // No D1 or R2 bindings — API Worker owns those
}
```

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@camatrimony/ui",
    "@camatrimony/shared",
    "@camatrimony/api-client",
    "@camatrimony/auth"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.camatrimonybncn.com",
        pathname: "/v1/uploads/**"
      }
    ],
    // Cloudflare Pages requires unoptimized images for static export
    unoptimized: true
  }
};

export default nextConfig;
```

### Pages (with fixes applied)

| Route | Status | Fix Applied |
|---|---|---|
| `/` | Existing | Make profiles/plans dynamic from API |
| `/about` | Existing | — |
| `/how-it-works` | Existing | — |
| `/plans` | Existing | **FIXED:** "Upgrade" buttons → `/checkout?package=X` |
| `/success-stories` | Existing | Fetch from API |
| `/contact` | Existing | **FIXED:** Real API submission via `POST /v1/contact` |
| `/privacy-policy` | Existing | — |
| `/terms-and-conditions` | Existing | — |
| `/refund-policy` | Existing | — |
| `/login` | Existing | — |
| `/register` | Existing | Differentiate from login |
| `/forgot-password` | **NEW** | Password reset flow |
| `/onboarding` | Existing | **FIXED:** Redirect → `/dashboard`, progress saved to localStorage |
| `/dashboard` | Existing | **FIXED:** Real contact info on unlock, unlock balance display, "Buy more" CTA, empty state, loading skeleton |
| `/profile` | Existing | **FIXED:** Real contact info, report/block buttons, back to dashboard, empty state |
| `/profile/edit` | Existing | **FIXED:** Real R2 upload, photo preview, delete confirmation |
| `/chat` | Existing | **FIXED:** Real API calls, `?id=` param handling, polling, empty state, search |
| `/favorites` | Existing | **FIXED:** Empty state |
| `/interests` | Existing | **FIXED:** Empty states per tab |
| `/notifications` | Existing | **FIXED:** Empty state, type filter, delete option |
| `/settings` | Existing | **FIXED:** Real API saves via `PATCH /v1/user/settings` |
| `/checkout` | **NEW** | Razorpay checkout flow |
| `/payment/success` | **NEW** | Post-payment confirmation |
| `/payment/failure` | **NEW** | Payment failure with retry |
| `/my-plan` | **NEW** | Current plan, renewal date, cancel, upgrade |
| `/support` | **NEW** | Submit/view support tickets |
| `/help` | **NEW** | FAQ/help center |

### Components
- `Navbar` — **FIXED:** proper logout, API base URL from env
- `Footer` — **FIXED:** real social media links or remove icons
- `ProfileWizard` — **FIXED:** real R2 upload, redirect to `/dashboard`, progress persistence

---

## 6. Admin App (admin.camatrimonybncn.com)

### Runtime
- Next.js 16 on Cloudflare Pages
- **No API routes** — all data fetched from `api.camatrimonybncn.com/v1/admin/*`
- **No D1/R2 bindings**

### `wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "camatrimony-admin",
  "pages_build_output_dir": ".vercel/output/static",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@camatrimony/ui",
    "@camatrimony/shared",
    "@camatrimony/api-client",
    "@camatrimony/auth"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.camatrimonybncn.com",
        pathname: "/v1/uploads/**"
      }
    ],
    unoptimized: true
  }
};

export default nextConfig;
```

### Pages (with fixes applied)

| Route | Status | Fix Applied |
|---|---|---|
| `/` (dashboard) | Existing | **FIXED:** Real data, date range filter, refresh button |
| `/login` | Existing | **FIXED:** Rate limiting, 2FA option, session warning |
| `/users` | Existing | **FIXED:** Sort works, full creation form (40+ fields) |
| `/users/[id]` | Existing | **FIXED:** KYC via dedicated endpoint, document viewer with zoom/download |
| `/kyc` | Existing | **FIXED:** Server-side pagination, bulk approve/reject, zoom/rotate/download, request additional docs |
| `/subscriptions` | Existing | **FIXED:** Fetch packages from API, date picker for extend |
| `/packages` | **NEW** | Package CRUD (create/edit/disable/delete) |
| `/payments` | Existing | **FIXED:** Partial refund, reason field, date range filter, receipt download |
| `/matches` | Existing | — |
| `/communication` | Existing | **FIXED:** Template editor, preview, scheduling |
| `/moderation` | Existing | **FIXED:** Content preview, bulk actions, strike escalation |
| `/mediation` | Existing | **FIXED:** Calendar picker, meeting notes |
| `/cms` | Existing | **FIXED:** Full CMS, logo upload, page content, FAQ management |
| `/audit` | Existing | **FIXED:** Date/action/admin filters, export, pagination |
| `/analytics` | Existing | **FIXED:** Date range, charts, drill-down |
| `/photos` | **NEW** | Photo approval queue with approve/reject/delete/visibility |
| `/settings` | Existing | **FIXED:** System config, admin profile editing, admin_accounts management |
| `/support` | **NEW** | Support ticket management (assign, status, respond) |

### Layout
- `AdminLayout` — **FIXED:** Visible logout button, session expiry warning, RBAC-aware sidebar

---

## 7. Database Migrations

### `migrations/0004_missing_tables.sql` (NEW)

```sql
-- 1. Success Stories table (referenced by CMS API but doesn't exist)
CREATE TABLE IF NOT EXISTS success_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date TEXT,
  location TEXT,
  description TEXT NOT NULL,
  image_url TEXT,
  is_featured INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Admin Accounts table (referenced by admin auth but doesn't exist)
-- NOTE: Use bcryptjs or PBKDF2/Argon2id via Web Crypto. Native bcrypt cannot run in Workers.
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'moderator',
  is_active INTEGER DEFAULT 1,
  two_factor_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- 2a. Admin Sessions table (server-side token validation)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
);

-- 3. Photos table (for photo approval workflow)
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'profile', -- 'profile', 'govt_id', 'degree'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  visibility TEXT DEFAULT 'public', -- 'public', 'matches_only', 'password_protected'
  password_hash TEXT,
  rejection_reason TEXT,
  is_watermarked INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Settings table (for privacy/notification preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  hide_profile INTEGER DEFAULT 0,
  hide_contact INTEGER DEFAULT 0,
  hide_income INTEGER DEFAULT 0,
  photo_visibility TEXT DEFAULT 'public',
  notify_interests INTEGER DEFAULT 1,
  notify_messages INTEGER DEFAULT 1,
  notify_kyc INTEGER DEFAULT 1,
  notify_payments INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Contact Submissions table (for contact form)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- 'new', 'read', 'responded', 'closed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Promo Codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `migrations/0006_photo_backfill.sql` (NEW)

Run this **after** deploying the API and creating the `photos` table. It backfills existing profile photos from `profiles.photos` JSON into the new `photos` table.

```sql
INSERT INTO photos (user_id, file_url, category, status, visibility)
SELECT
  p.user_id,
  value AS file_url,
  'profile' AS category,
  'approved' AS status,
  'public' AS visibility
FROM profiles p,
  json_each(CASE WHEN p.photos IS NULL OR p.photos = '' THEN '[]' ELSE p.photos END)
WHERE json_valid(CASE WHEN p.photos IS NULL OR p.photos = '' THEN '[]' ELSE p.photos END);
```

### `migrations/0005_fixes.sql` (NEW)

```sql
-- Add contact_limit_balance to user_subscriptions for tracking remaining unlocks
ALTER TABLE user_subscriptions ADD COLUMN contact_limit_balance INTEGER DEFAULT 0;

-- Add mediation_addon flag to user_subscriptions
ALTER TABLE user_subscriptions ADD COLUMN has_mediation INTEGER DEFAULT 0;

-- Add is_featured_until to profiles for time-limited featured status
ALTER TABLE profiles ADD COLUMN is_featured_until TIMESTAMP;

-- Add password_hash to users for future password-based auth
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Add deleted_at to users for soft delete
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

-- Add resolved_by and resolution to reports (if not already added)
-- (already added in 0003, skip if exists)

-- Add admin_notes to support_tickets
ALTER TABLE support_tickets ADD COLUMN admin_notes TEXT;

-- Seed initial admin account with password hash
-- NOTE: Generate the hash using bcryptjs (Node) or PBKDF2/Argon2id. Do NOT use native bcrypt in Workers.
-- Example: npx bcryptjs-cli "MatrimonyAdmin2026!" 10
INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, display_name, email, role, is_active)
VALUES ('super-admin-001', 'admin', 'REPLACE_WITH_HASH', 'Super Administrator', 'admin@camatrimonybncn.com', 'super_admin', 1);
```

---

## 8. Domain & DNS Setup

### Cloudflare DNS Records

| Type | Name | Content | Proxy |
|---|---|---|---|
| A/CNAME | `@` (camatrimonybncn.com) | Cloudflare Pages (web app) | Proxied |
| CNAME | `admin` | Cloudflare Pages (admin app) | Proxied |
| CNAME | `api` | Cloudflare Worker (api app) | Proxied |

### Cloudflare Pages Custom Domains
- **Web app**: Add custom domain `camatrimonybncn.com` to the `camatrimony-web` Pages project
- **Admin app**: Add custom domain `admin.camatrimonybncn.com` to the `camatrimony-admin` Pages project

### Cloudflare Workers Custom Domain
- **API worker**: Add route `api.camatrimonybncn.com/*` → `camatrimony-api` Worker

### Staging Environment

| Subdomain | App | Notes |
|---|---|---|
| `staging.camatrimonybncn.com` | `camatrimony-web-staging` | Points to staging Pages branch |
| `staging-admin.camatrimonybncn.com` | `camatrimony-admin-staging` | Points to staging Pages branch |
| `staging-api.camatrimonybncn.com` | `camatrimony-api-staging` | Separate Worker, can share D1 or use staging D1 |

---

## 9. Environment Variables

### `apps/web` — `.env` (Cloudflare Pages env vars)
```
NEXT_PUBLIC_API_BASE_URL=https://api.camatrimonybncn.com/v1
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
```

### `apps/admin` — `.env` (Cloudflare Pages env vars)
```
NEXT_PUBLIC_API_BASE_URL=https://api.camatrimonybncn.com/v1
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### `apps/api` — Worker secrets (via `wrangler secret put`)
```
FIREBASE_PROJECT_ID=...           # For JWT verification
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RESEND_API_KEY=...
ADMIN_JWT_SECRET=...              # HMAC secret for admin session tokens
CORS_ORIGIN=https://camatrimonybncn.com,https://admin.camatrimonybncn.com
```

### Staging Environment Variables
Use separate staging values for each app:
- `NEXT_PUBLIC_API_BASE_URL=https://staging-api.camatrimonybncn.com/v1`
- Separate Worker secrets via `wrangler secret put --env staging`

### `packages/*` — No env vars (pure libraries)

---

## 10. UX Fixes Bundled Into This Rebuild

### Critical Fixes

| # | Fix | App | Details |
|---|---|---|---|
| 1 | **Checkout/payment flow** | web | New `/checkout` page loads Razorpay SDK, calls `POST /v1/payments/create`, opens checkout modal, redirects to `/payment/success` or `/payment/failure` |
| 2 | **Chat wired to API** | web | `/chat` calls `GET/POST /v1/chat`, handles `?id=` param to open specific conversation, polls every 5s for new messages |
| 3 | **Real contact info on unlock** | api + web | `POST /v1/unlocks` returns target user's real phone/email from D1; checks + deducts from `contact_limit_balance` |
| 4 | **Onboarding redirect** | web | `ProfileWizard` redirects to `/dashboard` instead of `/` |
| 5 | **Settings save to API** | web + api | New `GET/PATCH /v1/user/settings` endpoint; settings page calls it |
| 6 | **Contact form real submission** | web + api | New `POST /v1/contact` endpoint saves to `contact_submissions` table + emails admin |
| 7 | **Missing tables migration** | api | `0004_missing_tables.sql` creates `success_stories`, `admin_accounts`, `photos`, `user_settings`, `contact_submissions`, `promo_codes` |

### Admin Fixes

| # | Fix | App | Details |
|---|---|---|---|
| 8 | **Logout button** | admin | Visible logout button in admin layout sidebar/header |
| 9 | **Package CRUD** | admin + api | New `/admin/packages` page + `GET/POST/PATCH/DELETE /v1/admin/packages` |
| 10 | **Dedicated KYC endpoint** | admin + api | `POST /v1/admin/kyc/:id/approve` and `/reject` instead of generic endpoint |
| 11 | **Report submission** | web + api | `POST /v1/reports` + report button on profile page |
| 12 | **Support tickets** | web + admin + api | Full support ticket system: user submits, admin manages |

### Polish Fixes

| # | Fix | App | Details |
|---|---|---|---|
| 13 | **Empty states** | web | All list pages show `EmptyState` component when no data |
| 14 | **Loading skeletons** | web | `Skeleton` components while fetching |
| 15 | **Unlock balance + CTA** | web | Dashboard shows remaining unlocks, "Buy more" → `/plans` |
| 16 | **Footer social links** | web | Real URLs or remove icons |
| 17 | **Dynamic homepage content** | web | Fetch profiles/plans/stories from API |
| 18 | **Admin sort functionality** | admin | Users page sort actually works |
| 19 | **Admin date range filters** | admin | Dashboard, payments, audit, analytics |
| 20 | **Admin partial refund** | admin + api | Refund modal with amount + reason fields |

---

## 11. Missing Screens to Build

### Web App — New Pages

| Page | Route | Purpose |
|---|---|---|
| Checkout | `/checkout?package=X` | Razorpay payment modal, order creation, payment processing |
| Payment Success | `/payment/success` | Confirmation, receipt, next steps |
| Payment Failure | `/payment/failure` | Error details, retry button, support link |
| My Plan | `/my-plan` | Current subscription, renewal date, cancel, upgrade |
| Forgot Password | `/forgot-password` | Password reset via email/phone |
| Support | `/support` | Submit support ticket, view ticket history, add messages |
| Help Center | `/help` | FAQ, guides, contact options |

### Admin App — New Pages

| Page | Route | Purpose |
|---|---|---|
| Package Management | `/packages` | CRUD for subscription plans |
| Photo Moderation | `/photos` | Photo approval queue with approve/reject/delete/visibility |
| Support Tickets | `/support` | Ticket management (assign, status, respond) |

---

## 12. Missing API Endpoints to Build

### User-Facing (NEW)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/profiles/:id` | Get single profile by user ID |
| `GET` | `/v1/profiles/search-by-id` | Search by profile ID code |
| `POST` | `/v1/reports` | Submit a report against a user |
| `GET` | `/v1/reports` | View own submitted reports |
| `GET` | `/v1/support` | List user's support tickets |
| `POST` | `/v1/support` | Create new support ticket |
| `POST` | `/v1/support/:id/message` | Add message to ticket |
| `PATCH` | `/v1/chat/:id/read` | Mark message as read |
| `POST` | `/v1/contact` | Contact form submission |
| `GET` | `/v1/user/settings` | Get user privacy/notification settings |
| `PATCH` | `/v1/user/settings` | Save user privacy/notification settings |

### Admin (NEW)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/admin/auth/validate` | Server-side token validation (FIXED) |
| `GET` | `/v1/admin/packages` | List all packages |
| `POST` | `/v1/admin/packages` | Create package |
| `PATCH` | `/v1/admin/packages/:id` | Update package |
| `DELETE` | `/v1/admin/packages/:id` | Delete/disable package |
| `GET` | `/v1/admin/kyc` | KYC queue with pagination |
| `POST` | `/v1/admin/kyc/:id/approve` | Approve KYC |
| `POST` | `/v1/admin/kyc/:id/reject` | Reject KYC with reason |
| `POST` | `/v1/admin/kyc/:id/request-docs` | Request additional documents |
| `GET` | `/v1/admin/photos` | Photo approval queue |
| `POST` | `/v1/admin/photos/:id/approve` | Approve photo |
| `POST` | `/v1/admin/photos/:id/reject` | Reject photo |
| `DELETE` | `/v1/admin/photos/:id` | Delete photo |
| `PATCH` | `/v1/admin/photos/:id/visibility` | Set photo visibility |
| `GET` | `/v1/admin/settings` | Get system settings |
| `PATCH` | `/v1/admin/settings` | Update system settings |
| `GET` | `/v1/admin/communication` | Communication history |
| `POST` | `/v1/admin/communication` | Send announcement |
| `GET` | `/v1/admin/support` | List all support tickets |
| `PATCH` | `/v1/admin/support/:id` | Update ticket status/assignment |
| `PATCH` | `/v1/admin/cms/stories/:id` | Edit success story |
| `DELETE` | `/v1/admin/cms/stories/:id` | Delete success story |

---

## 13. Security Fixes

| Issue | Fix | Location |
|---|---|---|
| **Firebase JWT not verified** | Use Web Crypto to verify JWT signature against Firebase's public keys (Google JWKS) | `packages/auth/src/jwt.ts` |
| **Hardcoded admin password** | Remove hardcoded credentials, use `admin_accounts` table with password hashes (bcryptjs or PBKDF2/Argon2id) | `apps/api/src/routes/admin/auth.ts` |
| **Admin token not validated server-side** | Store session tokens in `admin_sessions` table (or use HMAC-signed JWT), validate on every admin request | `packages/auth/src/admin-auth.ts` |
| **Webhook signature skipped** | Call `verifyPaymentSignature()` with the raw body in webhook handler | `apps/api/src/routes/payments.ts` |
| **Self-verification via REPLACE INTO** | `POST /v1/profile` must NOT accept `is_verified` or `is_featured` from client — force these to existing values | `apps/api/src/routes/profile.ts` |
| **SQL injection via orderBy** | Use strict whitelist mapping for sort parameters, never interpolate user input | `apps/api/src/routes/profiles.ts` |
| **CORS** | API Worker enforces CORS to only allow `camatrimonybncn.com` and `admin.camatrimonybncn.com` | `apps/api/src/middleware/cors.ts` |

---

## 14. Migration Steps (Current → New)

### Step 1: Initialize Monorepo
1. Create root `package.json` with pnpm workspaces
2. Create `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "packages/*"
     - "apps/*"
   ```
3. Create `turbo.json` for build pipeline
4. Install dependencies: `pnpm install`
5. Move `.gitignore`, `AGENTS.md`, `CLAUDE.md` to root
6. Add `node_modules` and `dist/` to root `.gitignore`

### Step 2: Extract Shared Packages
1. Create `packages/shared` — move types from `AuthContext.tsx`, `auth-middleware.ts`
2. Create `packages/db` — move `db.ts`, `db-mock.ts`
3. Create `packages/auth` — split into `client/` and `server/` subpath exports
4. Create `packages/payments` — move `razorpay.ts`, add checkout SDK loader
5. Create `packages/email` — move `email.ts`
6. Create `packages/storage` — move `r2-upload.ts`
7. Create `packages/ui` — move all `components/ui/*`
8. Create `packages/api-client` — new typed fetch wrapper
9. Build all packages: `pnpm build`

### Step 3: Create API Worker (`apps/api`)
1. Initialize Hono project with `wrangler.jsonc` (D1 + R2 bindings)
2. Convert all existing Next.js API routes to Hono routes
3. Add all NEW endpoints from Section 12
4. Apply security fixes from Section 13
5. Set secrets via `wrangler secret put`
6. Test locally with `wrangler dev`

### Step 4: Create Web App (`apps/web`)
1. Copy current Next.js app, remove all `/api/*` routes
2. Remove all `/admin/*` pages
3. Remove `middleware.ts` admin subdomain logic
4. Replace direct DB calls with `@camatrimony/api-client` calls
5. Apply all UX fixes from Section 10
6. Add all NEW pages from Section 11
7. Update `wrangler.jsonc` (remove D1/R2 bindings)
8. Add `next.config.ts` with image domains and transpilePackages
9. Test locally with `next dev` + `wrangler dev` (API)

### Step 5: Create Admin App (`apps/admin`)
1. Copy current Next.js app, move `/admin/*` page files to root routes (`/login`, `/users`, `/dashboard`, etc.)
2. Remove all `/api/*` routes
3. Remove all user-facing pages
4. Replace direct DB calls with admin API client
5. Apply all admin UX fixes from Section 10
6. Add all NEW admin pages from Section 11
7. Update `wrangler.jsonc` (remove D1/R2 bindings)
8. Add `next.config.ts` with image domains and transpilePackages
9. Test locally

### Step 6: Run Migrations
1. Apply `0004_missing_tables.sql` to production D1
2. Apply `0005_fixes.sql` to production D1
3. Seed `admin_accounts` with a proper password hash (using bcryptjs or PBKDF2)
4. Apply `0006_photo_backfill.sql` to migrate existing profile photos into `photos` table
5. Verify all tables exist and have expected data

### Step 7: Staging Deploy & Test
1. Deploy API Worker staging: `cd apps/api && wrangler deploy --env staging`
2. Deploy Web App staging: `cd apps/web && pnpm run build && npx @cloudflare/next-on-pages && wrangler pages deploy --env staging`
3. Deploy Admin App staging: `cd apps/admin && pnpm run build && npx @cloudflare/next-on-pages && wrangler pages deploy --env staging`
4. Configure staging custom domains
5. Run full end-to-end test on staging

### Step 8: Production Cutover
1. **Pre-cutover checks**
   - Confirm all migrations applied successfully
   - Confirm Razorpay webhook URL updated to `https://api.camatrimonybncn.com/v1/payments/webhook`
   - Confirm all environment variables and secrets set
   - Confirm staging tests passed
2. **Deploy to production**
   - Deploy API Worker: `cd apps/api && wrangler deploy`
   - Deploy Web App: `cd apps/web && pnpm run build && npx @cloudflare/next-on-pages && wrangler pages deploy`
   - Deploy Admin App: `cd apps/admin && pnpm run build && npx @cloudflare/next-on-pages && wrangler pages deploy`
3. **Configure production custom domains**
   - `camatrimonybncn.com` → web app
   - `admin.camatrimonybncn.com` → admin app
   - `api.camatrimonybncn.com` → API worker
4. **Run production smoke tests**
   - Login/logout
   - Profile creation
   - Payment flow (with Razorpay test mode)
   - Chat flow
   - Admin login
   - KYC approval
   - Unlock contact
5. **Keep old app running as fallback for 24–48 hours**
   - Monitor error rates and user reports
   - If critical failure occurs, switch DNS back to old app

### Step 9: Decommission Old App (after 48h stable)
1. Verify new deployments work for 48 hours
2. Remove old `camatrimony` Pages project
3. Clean up old DNS records
4. Archive old codebase branch

---

## 14.1 Production Cutover & Rollback Strategy

### Cutover Order
1. **D1 migrations first** (additive, backwards-compatible for old app)
2. **API Worker** (deploys to `api.camatrimonybncn.com`)
3. **Web App** (deploys to `camatrimonybncn.com`)
4. **Admin App** (deploys to `admin.camatrimonybncn.com`)
5. **Update Razorpay webhook URL** in dashboard
6. **Monitor for 24–48 hours**
7. **Decommission old app**

### Rollback Plan
If a critical failure occurs within 48 hours:
1. Switch Cloudflare DNS records back to the old `camatrimony` Pages project
2. Revert Razorpay webhook URL to the old app endpoint
3. Investigate and fix in staging
4. Re-cutover when ready

### What stays the same during cutover
- D1 database is shared (both old and new apps use it)
- R2 bucket is shared
- Firebase project is unchanged
- User sessions on Firebase are preserved
- Admin sessions are NOT preserved (new admin auth system)

---

## 15. Build & Deploy Commands

### Root `package.json`
```json
{
  "name": "camatrimony-monorepo",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "dev:api": "cd apps/api && wrangler dev",
    "dev:web": "cd apps/web && next dev",
    "dev:admin": "cd apps/admin && next dev",
    "build:api": "cd apps/api && wrangler deploy --dry-run",
    "build:web": "cd apps/web && next build",
    "build:admin": "cd apps/admin && next build",
    "deploy:api": "cd apps/api && wrangler deploy",
    "deploy:web": "cd apps/web && pnpm run build && npx @cloudflare/next-on-pages && wrangler pages deploy",
    "deploy:admin": "cd apps/admin && pnpm run build && npx @cloudflare/next-on-pages && wrangler pages deploy",
    "db:migrate": "wrangler d1 migrations apply camatrimony-db",
    "db:migrate-local": "wrangler d1 migrations apply camatrimony-db --local"
  }
}
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipelines": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", ".vercel/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    }
  }
}
```

---

## 16. Testing Strategy

### Unit Tests
- `packages/payments` — Razorpay order creation, signature verification, refund logic
- `packages/auth` — JWT verification, admin token validation, RBAC permission checks
- `packages/shared` — validation utilities, astrology scoring

### API Integration Tests
- Use `vitest` + `miniflare` to test Hono routes against a local D1 database
- Test all CRUD endpoints with auth middleware
- Test payment webhook signature verification
- Test file upload flow with mocked R2

### End-to-End Tests
- User flow: register → onboarding → dashboard → unlock contact → chat → payment
- Admin flow: login → KYC approve → subscription assign → refund → moderation
- Run on staging environment before production cutover

### Manual Smoke Tests (Production)
- [ ] Homepage loads and shows dynamic data
- [ ] Google login works
- [ ] Phone OTP login works
- [ ] Onboarding completes and redirects to dashboard
- [ ] Dashboard search/filters work
- [ ] Contact unlock shows real phone/email
- [ ] Chat sends/receives messages
- [ ] Razorpay payment creates subscription
- [ ] Webhook updates subscription after payment
- [ ] Admin login works
- [ ] Admin can approve KYC
- [ ] Admin can process refund
- [ ] Admin can create/edit package

---

## 17. Direct Production Rollout Checklist

There are no phased timelines. Complete the entire rebuild, then deploy directly to production.

### Pre-Deployment
- [ ] Monorepo structure set up with pnpm + Turborepo
- [ ] All shared packages building successfully
- [ ] API Worker passes all integration tests
- [ ] Web App passes all E2E tests
- [ ] Admin App passes all E2E tests
- [ ] Migrations applied to production D1
- [ ] Admin account seeded with secure password hash
- [ ] Photos backfilled from existing profiles
- [ ] All environment variables and secrets configured
- [ ] Staging environment tested and signed off
- [ ] Razorpay webhook URL updated to new API

### Deployment
- [ ] Deploy API Worker to `api.camatrimonybncn.com`
- [ ] Deploy Web App to `camatrimonybncn.com`
- [ ] Deploy Admin App to `admin.camatrimonybncn.com`
- [ ] Configure custom domains
- [ ] Run production smoke tests
- [ ] Monitor error rates for 24–48 hours

### Post-Deployment (within 48 hours)
- [ ] Confirm no critical errors
- [ ] Confirm payment flows working
- [ ] Confirm admin login/workflow working
- [ ] Decommission old single-app deployment

### Follow-up Features (after cutover)
These are not part of the initial rebuild. Implement in subsequent sprints:
- [ ] Photo watermarking
- [ ] Video bios
- [ ] Promo code system
- [ ] Mediation add-on pricing
- [ ] Female free trial auto-grant
- [ ] Profile ID search
- [ ] Real-time chat (WebSocket via Durable Objects)
- [ ] Push notifications
- [ ] Mobile app (React Native)

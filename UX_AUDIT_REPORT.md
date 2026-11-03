# UX Flow Audit Report — CA Matrimony BNCN

**Date:** 2026-07-06
**Scope:** Full audit of user-facing pages, admin pages, public pages, API routes, and requirements coverage.

---

## Table of Contents

1. [Critical: Broken End-to-End Flows](#critical-broken-end-to-end-flows)
2. [High: Missing Screens](#high-missing-screens-that-should-exist)
3. [High: Admin Panel Broken Flows](#high-admin-panel-broken-flows)
4. [Medium: Missing UX Options & Dead Ends](#medium-missing-ux-options--dead-ends)
5. [Medium: Missing API Endpoints](#medium-missing-api-endpoints-frontend-needs-these)
6. [Low: Polish Issues](#low-polish-issues)
7. [Requirements Not Implemented](#requirements-specified-but-not-implemented)
8. [Priority Fix Order](#priority-fix-order)

---

## Critical: Broken End-to-End Flows

Users cannot complete these core tasks.

### 1. No Payment/Checkout Flow — Users Cannot Buy Plans

The entire revenue path is broken.

- **Plans page** (`/plans`) "Upgrade to Gold/Diamond/Platinum" buttons link to `/register` (a login page), not a checkout.
  - `src/app/plans/page.tsx` lines 211-219
- **No `/checkout` or `/payment` page exists.**
- **No payment success/failure pages** (`/payment/success`, `/payment/failure`).
- The API exists (`/api/v1/payments/create` creates a Razorpay order) but **no UI calls it**.
- No Razorpay checkout SDK integration on the frontend.
- No "Current Plan" indicator, no upgrade/downgrade logic, no discount code input.
- **Female free 3-month trial**: "Claim Free Trial" button just goes to `/register` — no gender verification, no auto-grant logic.

### 2. Chat is Entirely Fake — Messages Don't Persist

- `/chat` page uses **2 hardcoded mock channels** and stores messages in React state only.
  - `src/app/chat/page.tsx` lines 38-59
- The `/api/v1/chat` endpoint exists (GET/POST) but **the page never calls it**.
- Messages are **lost on page refresh**.
- Profile page sends users to `/chat?id={profileId}` but **chat page ignores the `?id=` param** — doesn't open the specific conversation.
  - `src/app/profile/page.tsx` line 532
- No real-time updates (no polling or WebSocket).
- No empty state, no search, no read receipts, no typing indicators (only simulated).

### 3. Contact Unlock Shows Fake Data

- When a user unlocks a profile, the dashboard and profile detail page show **hardcoded phone `+91 6281 369 478` and email `support@camatrimonybncn.com`** — not the actual unlocked user's contact info.
  - `src/app/dashboard/page.tsx` line 742
  - `src/app/profile/page.tsx` lines 507-511
- The `/api/v1/unlocks` API records the unlock but **doesn't return the target user's real phone/email**.
- The unlock API also **doesn't check or deduct from the user's contact limit balance** — unlimited free unlocks.

### 4. Onboarding Redirects to Home Instead of Dashboard

- `ProfileWizard` redirects to `/` (homepage) after completion instead of `/dashboard`.
  - `src/components/registration/ProfileWizard.tsx` line 158
- User finishes a 7-step profile form and lands back on the marketing homepage — confusing dead-end.

### 5. Settings Page is Mock — Nothing Actually Saves

- Privacy toggles, notification preferences, and phone update all **just show a toast** — no API call, nothing persists.
  - `src/app/settings/page.tsx` line 110
- No backend endpoint exists for saving user settings/preferences.

### 6. Contact Form is Fake

- `/contact` form `handleSubmit` uses `setTimeout` to simulate submission — **no API call, no email sent**.
  - `src/app/contact/page.tsx` lines 49-60

---

## High: Missing Screens That Should Exist

| Missing Screen | Impact | Evidence |
|---|---|---|
| **Checkout/Payment page** | Cannot purchase plans | Plans buttons go to `/register` |
| **Payment success/failure pages** | No post-payment confirmation | No routes exist |
| **Subscription management page** (`/my-plan`) | Users can't view/cancel current plan | No route exists |
| **Password reset page** | No recovery if locked out | Login has no "forgot password" |
| **Profile detail by ID** (`/profile?id=X`) | Works but no dedicated `/profiles/[id]` route | Uses query param hack |
| **Support/Help center** | Users can't submit tickets | `support_tickets` table exists, no user-facing API or page |
| **Report user flow** | Users can't report abuse | `reports` table exists, admin can view, but no user-facing submit API or UI button |
| **Success story submission form** | Only email link, no form | `/success-stories` has "Share Your Story" → `mailto:` only |
| **Photo approval/moderation screen** | Admin can't review photos | No `photos` table, no admin photo API |

---

## High: Admin Panel Broken Flows

### 7. Admin Login Has No Logout

- The admin layout (`admin/layout.tsx`) has a `handleLogout` function, but **no visible logout button rendered** in the sidebar/header — admins are stuck.
- Session expires silently after 8 hours with no warning.

### 8. KYC Approval Uses Wrong API Endpoint

- Admin user detail page calls `POST /api/v1/admin` (generic endpoint) for KYC verification instead of a dedicated KYC endpoint.
  - `src/app/admin/users/detail/page.tsx` line 103
- No `/api/v1/admin/kyc` route exists.

### 9. No Package Management

- Admin subscriptions page **hardcodes packages in component code** — no CRUD API.
  - `src/app/admin/subscriptions/page.tsx` lines 22-26
- No `/api/v1/admin/packages` endpoint.
- Admin cannot create, edit, price, or disable subscription plans.

### 10. CMS Success Stories Will Crash

- `/api/v1/admin/cms` queries `SELECT * FROM success_stories` but **the `success_stories` table doesn't exist in any migration**.
  - `src/app/api/v1/admin/cms/route.ts` line 23
- The feature will throw a SQL error at runtime.

### 11. `admin_accounts` Table Missing

- Admin auth queries `admin_accounts` table that **doesn't exist in migrations** — always falls back to hardcoded credentials (`admin` / `MatrimonyAdmin2026!`).
  - `src/app/api/v1/admin/auth/route.ts` lines 14-24

### 12. Admin User Creation Form is Incomplete

- Manual user creation modal captures only 8 fields (email, phone, gender, age, degree, occupation, income, location, caste).
  - `src/app/admin/users/page.tsx` lines 42-52
- ProfileWizard captures 40+ fields. Admin-created profiles are severely incomplete.

### 13. Moderation Page Has No Content Preview

- Admin can see reports but **cannot view the actual reported content** (photos, chat messages).
- No way to see the reported user's profile or conversation context.

---

## Medium: Missing UX Options & Dead Ends

### User-Facing

| Issue | Detail |
|---|---|
| **No empty states** | Favorites, interests, notifications, chat, dashboard — all show nothing or break with zero results |
| **No loading skeletons** | Dashboard, favorites, interests fetch data with no skeleton/spinner |
| **No "Back to Dashboard"** on profile detail | User lands on a profile with no way back except browser back |
| **No report/block button** on profile detail | Only accessible via a modal, not prominent |
| **No "View Full Profile" button** on dashboard cards | Must click image/name — not obvious |
| **No unlock balance display** | User doesn't know how many unlocks they have left |
| **No "Buy more unlocks" CTA** | When out of credits, no link to plans page |
| **Register = Login** | Both pages are identical — confusing UX |
| **No "Skip onboarding"** | Must complete all 7 steps or abandon |
| **No progress persistence in onboarding** | Refresh loses all wizard progress |
| **No photo upload in ProfileWizard** | File upload is mocked, not connected to R2 |
| **No profile photo preview** in edit page | Can't see photos before uploading |
| **No delete confirmation** for photos in edit | One-click delete, no dialog |

### Admin-Facing

| Issue | Detail |
|---|---|
| **No date range filters** anywhere | Dashboard, payments, audit, analytics — all show all-time data |
| **No pagination on KYC page** | All pending KYCs load at once |
| **No bulk approve/reject** for KYC | One at a time only |
| **No document zoom/rotate/download** in KYC review | Basic `<img>` only |
| **No partial refund option** | Payments page only does full refunds |
| **No refund reason field** | Refund processed with no documentation |
| **No sort functionality** on users page | Sort button is a `console.log` stub |
| **No package create/edit UI** | Can only assign existing plans |
| **No template editor** for emails | Hardcoded templates, no preview |
| **No calendar integration** for mediation | Just a text input for date/time |
| **No export** on audit, analytics pages | Export exists on some pages but not all |
| **Dashboard "Register Candidate" button** | Links to `/admin/users` (list page), not a creation form |
| **No "Request additional documents"** in KYC | Only approve/reject |
| **No admin profile editing** | Admins can't edit their own info |
| **No 2FA** for admin login |

---

## Medium: Missing API Endpoints (Frontend Needs These)

| Missing Endpoint | Used By |
|---|---|
| `GET /api/v1/profiles/[id]` | Profile detail page (currently reuses catalog API) |
| `POST /api/v1/reports` | User report submission (no UI or API) |
| `GET/POST /api/v1/support` | Support tickets (table exists, no API or page) |
| `GET/POST/PATCH/DELETE /api/v1/admin/packages` | Package management |
| `GET/POST /api/v1/admin/photos` + approve/reject | Photo moderation |
| `PATCH /api/v1/chat/[id]/read` | Read receipts |
| `GET/PATCH /api/v1/admin/settings` | System settings (page exists, only manages roles) |
| `GET /api/v1/profiles/search-by-id` | Profile ID search (in requirements) |
| `POST /api/v1/contact` | Contact form submission (currently mocked) |
| `GET/PATCH /api/v1/user/settings` | Save privacy/notification preferences (currently mocked) |

---

## Low: Polish Issues

- **Footer social media icons are dead links** (`href="#"`) — Instagram, Facebook, LinkedIn.
  - `src/components/layout/Footer.tsx` lines 47-76
- **Homepage profiles, plans, success stories are hardcoded** — not fetched from API.
- **Dashboard registration trend data is hardcoded** in admin dashboard API.
  - `src/app/api/v1/admin/dashboard/route.ts` lines 126-133
- **No notification type filters** on notifications page.
- **No "Delete notification"** option.
- **No search/filter** on chat conversations list.
- **No message preview** in interests list.

---

## Requirements Specified But Not Implemented

From `md/Matrimony_Feature_Requirements_v2.md` and `md/ADMIN_PANEL_REQUIREMENTS.md`:

| Feature | Status |
|---|---|
| Photo privacy controls (public/matches-only/password-protected) | Not implemented |
| Photo watermarking | Not implemented |
| Video bios | Not implemented |
| Mediation service add-on pricing (₹500/₹1000/₹1500) | Not implemented |
| Promo codes/discounts | Not implemented |
| Profile ID search | Not implemented |
| Maidan add-on | Not implemented |
| Payment export | Not implemented |
| Female 3 months free auto-grant | Not implemented (button → register) |
| Contact limit deduction on unlock | Not implemented (unlimited free unlocks) |

---

## Priority Fix Order

### Must fix (core flows are broken)

1. Build checkout/payment flow (page + Razorpay SDK + success/failure pages)
2. Wire chat page to `/api/v1/chat` API + handle `?id=` param
3. Fix contact unlock to return real contact info + deduct from balance
4. Fix onboarding redirect → `/dashboard`
5. Wire settings page to a real API
6. Wire contact form to a real API/email
7. Create `success_stories` + `admin_accounts` migrations (CMS/auth will crash)

### Should fix (admin can't function)

8. Add logout button to admin layout
9. Create `/api/v1/admin/packages` CRUD
10. Create `/api/v1/admin/kyc` dedicated endpoint
11. Add report submission API + UI button
12. Add support ticket API + page

### Polish

13. Add empty states + loading skeletons to all list pages
14. Add unlock balance display + "buy more" CTA
15. Fix footer social links
16. Make homepage content dynamic

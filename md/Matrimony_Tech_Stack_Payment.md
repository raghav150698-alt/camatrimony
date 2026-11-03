# Matrimony Platform: Technical Stack & Payment Gateway Architecture

This document outlines the 100% serverless edge architecture leveraging the Cloudflare ecosystem and Razorpay integration. This stack ensures high scalability, global distribution, zero cold starts, and minimal operational overhead.

---

## 1. Core Technical Stack Architecture

### Frontend & API Edge Layer
*   **Hosting & Deployment Platform:** **Cloudflare Pages**
*   **Full-Stack Framework:** **Next.js (App Router)** or **Nuxt.js**
    *   *Implementation:* The application runs as a full-stack monolithic/hybrid application. Frontend pages are server-side rendered (SSR) at the edge for optimal speed and SEO performance. Backend API routes are natively compiled into Cloudflare Workers under the hood.

### Database & Storage Layer
*   **Primary Relational Database:** **Cloudflare D1 (Serverless SQL)**
    *   *Purpose:* Stores user accounts, profile fields (caste, religion, horoscope data), search filters, and subscription states.
    *   *Why:* Matrimony search criteria require highly structured relational queries (e.g., SQL indexing on location, age, income).
*   **Caching & Session Storage:** **Cloudflare KV (Key-Value)**
    *   *Purpose:* Fast retrieval of user session tokens, dynamic configuration tables (dropdown lists for castes, gothrams), and temporary OTP transaction states.
*   **Media & Document Storage:** **Cloudflare R2 (Object Storage)**
    *   *Purpose:* Houses user profile photos, short video bios, and uploaded government IDs for KYC verification.
    *   *Why:* **Zero egress fees** mean unlimited image loads for browsing profiles without skyrocketing data transfer costs.

### Real-Time Communication & Background Processing
*   **In-App Messaging System:** **Cloudflare Durable Objects & WebSockets**
    *   *Purpose:* Runs the secure, real-time messaging system entirely at the edge without requiring external third-party chat infrastructure or external state synchronization.
*   **Asynchronous Tasks:** **Cloudflare Queues**
    *   *Purpose:* Handles heavy asynchronous operations such as processing image uploads (automatic watermarking via Workers) and queuing transactional notification dispatches.

### Security & Bot Mitigation
*   **Scraping & Firewall Defense:** **Cloudflare WAF (Web Application Firewall)**
    *   *Purpose:* Safeguards user data against aggressive competitor scraping bots, DDoS attacks, and API exploitation.
*   **Spam Verification:** **Cloudflare Turnstile**
    *   *Purpose:* Delivers frictionless, invisible CAPTCHA verification at registration and login entry points.

---

## 2. Payment Gateway Integration: Razorpay Workflow

The platform leverages **Razorpay** to process premium tiered subscriptions (Gold, Diamond, Platinum) and mediation service add-ons. 

### Integration Workflow
```
[User Interface] ---> (Initiates Checkout) ---> [Razorpay Standard Checkout / Custom UI]
       ^                                                    |
       |                                                    v
(Success Notification) <--- [Cloudflare Worker Webhook] <--- (Payment Captured Callback)
                                    |
                                    v
                        [Updates Cloudflare D1 SQL]
```

### Technical Implementation Steps
1.  **Order Creation (Server-Side):**
    *   When a user selects a plan (e.g., Diamond Plan + 3 Months Mediation), a Cloudflare Worker securely calls the Razorpay Orders API using the API Key and Secret stored in Cloudflare Environment Secrets.
    *   An `order_id` is generated and sent back to the frontend.
2.  **Frontend Checkout Checkout (Client-Side):**
    *   The application mounts the Razorpay Checkout script using the returned `order_id`, displaying localized payment methods (UPI, Cards, NetBanking, Wallets).
3.  **Webhook Event Handling (Server-Side verification):**
    *   A dedicated Cloudflare Worker exposes a public endpoint (`/api/v1/payments/webhook`) to handle Razorpay events (`payment.captured`, `order.paid`).
    *   The worker validates the Razorpay webhook signature cryptographic integrity using the raw request body and secret.
    *   Upon successful signature validation, the worker executes a SQL write to **Cloudflare D1**, updating the user's subscription tier, billing expiration date, and contact unlock limits.

---

## 3. Infrastructure Component Mapping

| Platform Layer | Chosen Technology | Core Purpose |
| :--- | :--- | :--- |
| **Hosting & Frontend** | Cloudflare Pages (Next.js / Nuxt.js) | SSR rendering and global asset delivery. |
| **Relational Data** | Cloudflare D1 | Complex profile search queries and match indexing. |
| **Static Assets** | Cloudflare R2 | Cost-free egress storage for user images and KYC files. |
| **Real-time Chat** | Cloudflare Durable Objects | Edge-based WebSocket connections for chat rooms. |
| **Payment Handling** | Razorpay APIs & Webhooks | Premium subscription capture and localized INR payments. |
| **Async Tasks**| Cloudflare Queues | Profile photo watermarking and email notification dispatches. |
| **User Verification** | External SMS Gateway (via Worker API Fetch) | Mobile number OTP generation during registration. |

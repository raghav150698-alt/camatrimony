import type { Env } from "./types";
import { DEFAULT_API_BASE_URL, toAbsoluteMediaUrl } from "@camatrimony/shared";

// ============================================================
// Inlined Resend Email Service (Edge-compatible via fetch)
// ============================================================

const RESEND_API_URL = "https://api.resend.com/emails";
const SENDER_EMAIL = "CA Matrimony <notifications@camatrimonybncn.com>";

/**
 * Sends a raw HTML email using the Resend API.
 */
export async function sendEmail(env: Env, to: string, subject: string, htmlBody: string): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    if(env.ENVIRONMENT !== "development"){console.error("Email delivery is not configured.");return false;}
    console.log("==================== [MOCK EMAIL OUTBOX] ====================");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("-------------------------------------------------------------");
    console.log(htmlBody.replace(/<[^>]*>/g, " ").trim().substring(0, 400) + "...");
    console.log("=============================================================");
    return true;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [to],
        subject,
        html: htmlBody,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend API Error: ${errText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend email dispatch failed:", err);
    return false;
  }
}

const baseTemplate = (title: string, content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #faf5f5; color: #2a0909; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #ecd7d7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .header { background: linear-gradient(135deg, #7b1e1e 0%, #521313 100%); color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; }
        .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.85; }
        .body { padding: 40px 30px; line-height: 1.6; }
        .body h2 { color: #7b1e1e; font-size: 20px; margin-top: 0; }
        .code-box { background-color: #faf5f5; border: 1px dashed #debab9; border-radius: 12px; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; letter-spacing: 5px; color: #7b1e1e; margin: 25px 0; }
        .button { display: inline-block; padding: 12px 30px; background-color: #7b1e1e; color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: bold; margin: 25px 0; text-align: center; }
        .footer { background-color: #fcf6df; border-top: 1px solid #f7eab4; padding: 20px; text-align: center; font-size: 12px; color: #806522; }
        .footer p { margin: 5px 0; }
        .divider { height: 1px; background-color: #ecd7d7; margin: 25px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>CA MATRIMONY</h1>
          <p>Exclusive Professional Matches</p>
        </div>
        <div class="body">
          ${content}
        </div>
        <div class="footer">
          <p><strong>CA Matrimony BNCN</strong></p>
          <p>Verified Matrimonial Portal for Chartered Accountants &amp; CS Professionals</p>
          <p>&copy; 2026 CA Matrimony. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
`;

export type EmailTemplate =
  | "admin_otp"
  | "kyc_approved"
  | "kyc_rejected"
  | "interest_received"
  | "interest_accepted"
  | "plan_expiring"
  | "payment_confirmed"
  | "refund_processed"
  | "account_suspended"
  | "welcome";

/**
 * Renders a templated email and dispatches it via Resend.
 */
export async function sendTemplatedEmail(
  env: Env,
  to: string,
  templateName: EmailTemplate,
  variables: Record<string, string | number>
): Promise<boolean> {
  let subject = "";
  let bodyContent = "";
  const name = variables.name || "Member";

  switch (templateName) {
    case "admin_otp":
      subject = "CA Matrimony - Admin Security OTP Login Code";
      bodyContent = baseTemplate(
        "Admin OTP",
        `<h2>Admin Security Access Verification</h2>
        <p>Hello ${name},</p>
        <p>A login request was made to access your CA Matrimony Admin Control Panel console. Please use the following single-use verification code to authenticate. This code is valid for 10 minutes.</p>
        <div class="code-box">${variables.code}</div>
        <p>If you did not initiate this request, please contact the security administrator immediately.</p>`
      );
      break;

    case "kyc_approved":
      subject = "Congratulations! Your CA Matrimony Profile is Verified";
      bodyContent = baseTemplate(
        "KYC Approved",
        `<h2>Congratulations, your profile is verified!</h2>
        <p>Hello ${name},</p>
        <p>We are pleased to inform you that our audit team has successfully reviewed and approved your uploaded academic qualifications and government ID documents.</p>
        <p>A glowing <strong>Green Verified Badge</strong> has been appended to your matrimonial profile card. Other members can now view your profile with full trust, increasing your matchmaking activity!</p>
        <center><a href="https://camatrimonybncn.com/dashboard" class="button">Browse Verified Matches</a></center>`
      );
      break;

    case "kyc_rejected":
      subject = "Action Required: Profile Verification Resubmission";
      bodyContent = baseTemplate(
        "KYC Rejected",
        `<h2>Academic or Identity Verification Update</h2>
        <p>Hello ${name},</p>
        <p>Thank you for submitting your verification details. During our standard verification review, our moderation team found some discrepancies with your uploaded files:</p>
        <blockquote style="background-color: #faf5f5; border-left: 4px solid #7b1e1e; padding: 15px; margin: 20px 0; font-style: italic;">
          "${variables.reason || "Documents were blurry or illegible. Please ensure documents are clear and high-resolution."}"
        </blockquote>
        <p>To keep the platform safe and ensure all registrations represent legitimate professionals, please login and re-upload clear copies of your documents.</p>
        <center><a href="https://camatrimonybncn.com/onboarding" class="button">Re-upload Documents</a></center>`
      );
      break;

    case "interest_received":
      subject = "CA Matrimony - Someone has expressed interest in your profile!";
      bodyContent = baseTemplate(
        "New Match Interest",
        `<h2>A matching candidate has sent you an Interest!</h2>
        <p>Hello ${name},</p>
        <p>An exclusive professional candidate (<strong>${variables.senderDegree || "CA"}</strong>) is interested in matching with you!</p>
        <p>Login to your portal dashboard to view their professional profile, background details, and approve or decline the match request.</p>
        <center><a href="https://camatrimonybncn.com/interests" class="button">View Match Interest</a></center>`
      );
      break;

    case "interest_accepted":
      subject = "Great News! Your Interest request has been Accepted";
      bodyContent = baseTemplate(
        "Match Interest Accepted",
        `<h2>Your Interest request was mutually accepted!</h2>
        <p>Hello ${name},</p>
        <p>Great news! <strong>${variables.receiverName}</strong> has accepted your interest expression request.</p>
        <p>You can now view their shared contact coordinates and chat directly in your messages window. Happy matchmaking!</p>
        <center><a href="https://camatrimonybncn.com/chat" class="button">Open Chat Workspace</a></center>`
      );
      break;

    case "plan_expiring":
      subject = "Urgent: Your CA Matrimony Premium Subscription is Expiring";
      bodyContent = baseTemplate(
        "Subscription Expiring",
        `<h2>Your subscription plan is expiring soon</h2>
        <p>Hello ${name},</p>
        <p>This is a gentle reminder that your <strong>${variables.packageName || "Premium"}</strong> subscription is expiring in <strong>${variables.daysRemaining || 7} days</strong>.</p>
        <p>Renew now to continue enjoying premium matchmaking features including unlimited contact unlocks and priority profile visibility.</p>
        <center><a href="https://camatrimonybncn.com/pricing" class="button">Renew Subscription</a></center>`
      );
      break;

    case "payment_confirmed":
      subject = "Payment Confirmed - CA Matrimony Premium Activated";
      bodyContent = baseTemplate(
        "Payment Confirmed",
        `<h2>Payment Successful! 🌟</h2>
        <p>Hello ${name},</p>
        <p>We've received your payment of <strong>₹${variables.amount}</strong> for the <strong>${variables.packageName}</strong> plan.</p>
        <p>Your premium subscription is now active with the following benefits:</p>
        <ul>
          <li>Contact Unlocks: ${variables.contactLimit} profiles</li>
          <li>Valid Until: ${variables.expiryDate}</li>
          <li>Payment ID: ${variables.paymentId}</li>
          <li>Order ID: ${variables.orderId}</li>
        </ul>
        <center><a href="https://camatrimonybncn.com/dashboard" class="button">Start Matching</a></center>`
      );
      break;

    case "refund_processed":
      subject = "Refund Processed - CA Matrimony";
      bodyContent = baseTemplate(
        "Refund Processed",
        `<h2>Refund Processed Successfully</h2>
        <p>Hello ${name},</p>
        <p>Your refund of <strong>₹${variables.amount}</strong> has been processed. It may take 5-7 business days to reflect in your account.</p>
        <p>Payment ID: ${variables.paymentId}</p>`
      );
      break;

    case "account_suspended":
      subject = "Account Suspended - CA Matrimony";
      bodyContent = baseTemplate(
        "Account Suspended",
        `<h2>Account Suspended</h2>
        <p>Hello ${name},</p>
        <p>Your CA Matrimony account has been suspended due to a violation of our community guidelines.</p>
        <blockquote style="background-color: #faf5f5; border-left: 4px solid #7b1e1e; padding: 15px; margin: 20px 0; font-style: italic;">
          "${variables.reason || "Violation of matchmaking behavior guidelines."}"
        </blockquote>
        <p>If you believe this is an error, please contact our support team.</p>`
      );
      break;

    case "welcome":
      subject = "Welcome to CA Matrimony!";
      bodyContent = baseTemplate(
        "Welcome",
        `<h2>Welcome to CA Matrimony, ${name}!</h2>
        <p>We're thrilled to have you join our exclusive matrimonial portal for Chartered Accountants and CS professionals.</p>
        <p>Complete your profile to start receiving matched recommendations from verified professionals.</p>
        <center><a href="https://camatrimonybncn.com/onboarding" class="button">Complete Your Profile</a></center>`
      );
      break;
  }

  return sendEmail(env, to, subject, bodyContent);
}

// ============================================================
// Inlined Razorpay Payment Logic (Edge-compatible via fetch + Web Crypto)
// ============================================================

const hasKeys = (env: Env) => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

const getAuthHeader = (env: Env) => {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured");
  }
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
};

function generateMockOrderId(): string {
  return `order_mock_${crypto.randomUUID()}`;
}

/**
 * Creates a real Razorpay order. In development only, falls back to a mock order when keys are absent.
 */
export async function createOrder(
  env: Env,
  amount: number,
  currency: string = "INR",
  receipt: string,
  notes: Record<string, string> = {}
): Promise<{ id: string; amount: number; currency: string; isMock?: boolean } & Record<string, any>> {
  const amountInPaise = Math.round(amount * 100);

  if (!hasKeys(env)) {
    if (env.ENVIRONMENT === "development") {
      console.log(`[MOCK PAYMENTS] Creating dummy order for ₹${amount} (receipt: ${receipt})`);
      return {
        id: generateMockOrderId(),
        entity: "order",
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency,
        receipt,
        status: "created",
        attempts: 0,
        notes,
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      };
    }
    throw new Error("Razorpay keys are not configured");
  }

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(env),
      },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt, notes }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay API Error: ${errText}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    throw err;
  }
}

/**
 * Fetches a Razorpay order by id (used to read server-side notes / package binding).
 */
export async function fetchOrder(
  env: Env,
  orderId: string
): Promise<{ id: string; notes?: Record<string, string>; amount?: number; status?: string } & Record<string, any>> {
  if (orderId.startsWith("order_mock_")) {
    throw new Error("Cannot fetch mock order from Razorpay");
  }
  if (!hasKeys(env)) {
    throw new Error("Razorpay keys are not configured");
  }

  const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: { Authorization: getAuthHeader(env) },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Razorpay order fetch failed: ${errText}`);
  }
  return await res.json();
}

/**
 * Verifies Razorpay Payment signature using Web Crypto (HMAC-SHA256).
 */
export async function verifyPaymentSignature(
  env: Env,
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  if (orderId.startsWith("order_mock_")) {
    if (env.ENVIRONMENT === "development") {
      console.log("[MOCK PAYMENTS] Verification bypassed for mock order signature");
      return true;
    }
    return false;
  }

  // Checkout signatures are HMAC'd with the API key secret (not the webhook secret).
  const secret = env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("RAZORPAY_KEY_SECRET is missing. Cannot verify payment signature.");
    return false;
  }

  try {
    const textEncoder = new TextEncoder();
    const keyData = textEncoder.encode(secret);
    const messageData = textEncoder.encode(`${orderId}|${paymentId}`);

    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex === signature;
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}

/**
 * Verifies a Razorpay webhook signature (HMAC-SHA256 over the raw request body).
 */
export async function verifyWebhookSignature(env: Env, rawBody: string, signature: string): Promise<boolean> {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Razorpay webhook secret is not set. Cannot verify webhook signature.");
    return false;
  }

  try {
    const textEncoder = new TextEncoder();
    const keyData = textEncoder.encode(secret);
    const messageData = textEncoder.encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex === signature;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return false;
  }
}

/**
 * Initiates a full or partial refund via Razorpay.
 */
export async function processRefund(
  env: Env,
  paymentId: string,
  amount?: number,
  notes: Record<string, string> = {}
) {
  if (paymentId.startsWith("pay_mock_") || !hasKeys(env)) {
    if (env.ENVIRONMENT === "development") {
      console.log(`[MOCK PAYMENTS] Refunding mock payment ${paymentId} with amount: ${amount || "Full"}`);
      return {
        id: `rfnd_mock_${crypto.randomUUID()}`,
        entity: "refund",
        payment_id: paymentId,
        amount: amount ? Math.round(amount * 100) : 0,
        currency: "INR",
        status: "processed",
        notes,
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      };
    }
    throw new Error("Razorpay keys are not configured");
  }

  try {
    const body: Record<string, any> = { notes };
    if (amount) {
      body.amount = Math.round(amount * 100);
    }
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(env),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay Refund Error: ${errText}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Razorpay refund process failed:", err);
    throw err;
  }
}

// ============================================================
// Inlined R2 Upload Helpers
// ============================================================

/** Resolve public `/v1` API base for absolute media URLs. */
export function getPublicApiBase(env: Env, requestUrl?: string): string {
  if (env.PUBLIC_API_BASE) {
    return env.PUBLIC_API_BASE.replace(/\/$/, "");
  }
  if (requestUrl) {
    try {
      return `${new URL(requestUrl).origin}/v1`;
    } catch {
      // fall through
    }
  }
  return DEFAULT_API_BASE_URL;
}

/** Absolute URL for a stored media path or R2 key. */
export function absolutizeMediaUrl(
  url: string | null | undefined,
  apiBase: string = DEFAULT_API_BASE_URL
): string {
  return toAbsoluteMediaUrl(url, apiBase);
}

/** Parse R2 object key from stored URL or raw key string. */
export function extractUploadKey(urlOrKey: string | null | undefined): string | null {
  if (!urlOrKey) return null;
  const trimmed = String(urlOrKey).trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes("key=")) {
      const parsed = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, "http://localhost/v1/uploads");
      const key = parsed.searchParams.get("key");
      return key ? decodeURIComponent(key) : null;
    }
  } catch {
    // fall through
  }

  return trimmed.replace(/^\/+/, "");
}

/** Stream an R2 object (or dev mock) for authenticated download routes. */
export async function serveUploadObject(env: Env, key: string): Promise<Response> {
  const cleanKey = key.replace(/^\/+/, "");
  const bucket = env.BUCKET;

  if (!bucket) {
    console.log(`[MOCK R2 SERVE] Proxy serving mock content for key: ${cleanKey}`);
    if (cleanKey.includes("photos") || cleanKey.includes("success")) {
      const index = cleanKey.includes("2") ? "2" : "1";
      return Response.redirect(`/success_story_${index}.png`, 302);
    }
    return Response.json({ error: "Object not found in R2 bucket" }, { status: 404 });
  }

  const object = await bucket.get(cleanKey);
  if (!object) {
    return Response.json({ error: "Object not found in R2 bucket" }, { status: 404 });
  }

  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("Content-Type", object.httpMetadata.contentType);
  }
  if (object.httpMetadata?.cacheControl) {
    headers.set("Cache-Control", object.httpMetadata.cacheControl);
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "private, no-store");
  }

  return new Response(object.body, { headers });
}

/**
 * Uploads a file (ArrayBuffer) directly to Cloudflare R2.
 * Returns a path relative to `/v1` unless `apiBase` is provided (then absolute).
 */
export async function uploadToR2(
  bucket: R2Bucket | undefined,
  fileData: ArrayBuffer | string,
  key: string,
  contentType: string = "image/jpeg",
  apiBase?: string
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, "");

  if (!bucket) {
    throw new Error("R2 bucket binding is not configured");
  }

  try {
    await bucket.put(cleanKey, fileData, {
      httpMetadata: {
        contentType,
        cacheControl: "private, no-store",
      },
    });
    const relative = `/v1/uploads?key=${encodeURIComponent(cleanKey)}`;
    return apiBase ? toAbsoluteMediaUrl(relative, apiBase) : relative;
  } catch (err) {
    console.error(`R2 PUT upload failed for key: ${cleanKey}`, err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudflare R2 bucket.
 */
export async function deleteFromR2(bucket: R2Bucket | undefined, key: string): Promise<boolean> {
  const cleanKey = key.replace(/^\/+/, "");
  if (!bucket) {
    throw new Error("R2 bucket binding is not configured");
  }
  try {
    await bucket.delete(cleanKey);
    return true;
  } catch (err) {
    console.error(`R2 delete failed for key: ${cleanKey}`, err);
    return false;
  }
}

/**
 * Helper to generate a unique object key to avoid naming conflicts.
 */
export function generateR2Key(
  userId: string,
  category: "govt_id" | "degree" | "photos" | "payment_proof",
  originalName: string
): string {
  const timestamp = Date.now();
  const ext = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
  const safeName = originalName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 15)
    .toLowerCase();
  return `${userId}/${category}/${timestamp}_${safeName}${ext}`;
}

// ============================================================
// Misc helpers
// ============================================================

/**
 * Parses a photos JSON string field into an array.
 */
export function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  try {
    const parsed = typeof photos === "string" ? JSON.parse(photos) : photos || [];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string" && p.length > 0) : [];
  } catch {
    return [];
  }
}

/** Parse photos and rewrite each entry to an absolute media URL. */
export function parsePhotosAbsolute(photos: any, apiBase: string = DEFAULT_API_BASE_URL): string[] {
  return parsePhotos(photos)
    .map((p) => toAbsoluteMediaUrl(p, apiBase))
    .filter(Boolean);
}

/**
 * Ensures a Firebase user has a `users` row before FK-dependent writes (profiles, photos, etc.).
 */
export async function ensureUserRecord(
  db: D1Database,
  userId: string,
  email?: string | null,
  lastLoginAt?: string
): Promise<void> {
  const now = lastLoginAt || new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, email, status, last_login_at)
       VALUES (?, ?, 'pending_verification', ?)
       ON CONFLICT(id) DO UPDATE SET
         email = COALESCE(excluded.email, email),
         last_login_at = excluded.last_login_at`
    )
    .bind(userId, email || null, now)
    .run();
}

/**
 * admin_audit_log.admin_id FK references users(id), but panel logins use admin_accounts ids.
 * Mirror the admin account into users when missing so audit writes succeed locally.
 */
export async function ensureAdminAuditActor(
  db: D1Database,
  admin: { id: string; email?: string | null; role?: string }
): Promise<void> {
  const exists = await db
    .prepare("SELECT id FROM users WHERE id = ?")
    .bind(admin.id)
    .first<{ id: string }>();
  if (exists) return;

  const account = await db
    .prepare("SELECT id, email, role FROM admin_accounts WHERE id = ?")
    .bind(admin.id)
    .first<{ id: string; email: string | null; role: string }>();

  const email = account?.email ?? admin.email ?? null;
  const role = account?.role ?? admin.role ?? "moderator";

  await db
    .prepare(
      `INSERT INTO users (id, email, role, status)
       VALUES (?, ?, ?, 'active')
       ON CONFLICT(id) DO NOTHING`
    )
    .bind(admin.id, email, role)
    .run();
}

export async function logAdminAudit(
  db: D1Database,
  admin: { id: string; email?: string | null; role?: string },
  entry: {
    action_type: string;
    target_type: string;
    target_id?: string | null;
    details?: unknown;
    ip_address?: string | null;
  }
): Promise<void> {
  await ensureAdminAuditActor(db, admin);
  await db
    .prepare(
      `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      admin.id,
      entry.action_type,
      entry.target_type,
      entry.target_id ?? null,
      entry.details !== undefined ? JSON.stringify(entry.details) : null,
      entry.ip_address ?? null
    )
    .run();
}

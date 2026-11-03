import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";
import {
  createOrder,
  fetchOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  sendTemplatedEmail,
} from "../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/payments/packages - List available subscription packages
app.get("/packages", async (c) => {
  try {
    const db = c.env.DB;
    const rows = await db
      .prepare("SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC")
      .all();
    return c.json({ success: true, packages: rows.results || [] });
  } catch (err: any) {
    console.error("[Payments] List packages error:", err);
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

async function listUserPayments(c: any) {
  const user = c.get("user")!;
  try {
    const db = c.env.DB;
    const rows = await db
      .prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC")
      .bind(user.id)
      .all();
    return c.json({ success: true, payments: rows.results || [] });
  } catch (err: any) {
    console.error("[Payments] List payments error:", err);
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
}

// GET /v1/payments - List current user's payment history (matches api-client GET /payments)
app.get("/", requireAuth, listUserPayments);
// Backward-compat alias for older clients that called /v1/payments/payments
app.get("/payments", requireAuth, listUserPayments);

// GET /v1/payments/subscription - Current user's active subscription
app.get("/subscription", requireAuth, async (c) => {
  const user = c.get("user")!;
  try {
    const db = c.env.DB;
    const row = await db
      .prepare(
        `SELECT us.*, p.name as package_name, p.validity_days, p.contact_limit
         FROM user_subscriptions us
         LEFT JOIN packages p ON us.package_id = p.id
         WHERE us.user_id = ?
         ORDER BY us.created_at DESC
         LIMIT 1`
      )
      .bind(user.id)
      .first<any>();

    if (!row) {
      return c.json({ success: true, subscription: null });
    }

    return c.json({
      success: true,
      subscription: {
        ...row,
        packageId: row.package_id,
        planName: row.package_name,
        renewalDate: row.end_date,
        contactLimitBalance: row.contact_limit_balance,
        isActive: row.status === "active" && new Date(row.end_date).getTime() > Date.now(),
      },
    });
  } catch (err: any) {
    console.error("[Payments] Get subscription error:", err);
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

async function getCmsSetting(db: D1Database, key: string, fallback = ""): Promise<string> {
  try {
    const row = await db
      .prepare("SELECT setting_value FROM cms_settings WHERE setting_key = ?")
      .bind(key)
      .first<{ setting_value: string }>();
    return row?.setting_value ?? fallback;
  } catch {
    return fallback;
  }
}

async function isRazorpayEnabled(db: D1Database): Promise<boolean> {
  const val = await getCmsSetting(db, "razorpay_enabled", "0");
  return val === "1" || val === "true";
}

function isTruthySetting(val: string): boolean {
  return val === "1" || val === "true";
}

// GET /v1/payments/settings - Public payment gateway + manual payment configuration
app.get("/settings", async (c) => {
  try {
    const db = c.env.DB;
    const [
      razorpayEnabled,
      manualPaymentEnabled,
      upiId,
      upiQrUrl,
      paymentInstructions,
      bankAccountDetails,
      astrologyMatchEnabled,
    ] = await Promise.all([
      isRazorpayEnabled(db),
      getCmsSetting(db, "manual_payment_enabled", "1").then(isTruthySetting),
      getCmsSetting(db, "upi_id", ""),
      getCmsSetting(db, "upi_qr_url", ""),
      getCmsSetting(
        db,
        "payment_instructions",
        "Pay via UPI, then upload your payment screenshot for admin verification."
      ),
      getCmsSetting(db, "bank_account_details", ""),
      getCmsSetting(db, "astrology_match_enabled", "1").then(isTruthySetting),
    ]);

    return c.json({
      success: true,
      razorpayEnabled,
      razorpayKeyId: razorpayEnabled ? c.env.RAZORPAY_KEY_ID || null : null,
      manualPaymentEnabled,
      upiId,
      upiQrUrl,
      paymentInstructions,
      bankAccountDetails,
      astrologyMatchEnabled,
    });
  } catch (err: any) {
    console.error("[Payments] Get settings error:", err);
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

/**
 * POST /v1/payments/manual-proof
 * User submits UPI/bank payment proof while Razorpay is off.
 * Creates a pending_verification payment for admin review.
 */
app.post("/manual-proof", requireAuth, async (c) => {
  const user = c.get("user")!;
  try {
    const body = await c.req.json();
    const packageId = Number(body.packageId);
    const proofUrl = typeof body.proofUrl === "string" ? body.proofUrl.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!packageId || !proofUrl) {
      return c.json({ error: "packageId and proofUrl are required" }, 400);
    }

    const db = c.env.DB;
    const pkg = await db
      .prepare("SELECT * FROM packages WHERE id = ? AND is_active = 1")
      .bind(packageId)
      .first<{ id: number; name: string; price: number; validity_days: number; contact_limit: number }>();

    if (!pkg) {
      return c.json({ error: "Selected subscription package not found." }, 404);
    }

    const paymentId = `manual_${user.id.slice(0, 8)}_${Date.now()}`;
    const orderId = `manual_order_${Date.now()}`;

    await db
      .prepare(
        `INSERT INTO payments (id, user_id, package_id, amount, status, order_id, proof_url, payment_method, admin_notes)
         VALUES (?, ?, ?, ?, 'pending_verification', ?, ?, 'manual', ?)`
      )
      .bind(paymentId, user.id, pkg.id, pkg.price * 100, orderId, proofUrl, notes || null)
      .run();

    await db
      .prepare("UPDATE profiles SET payment_proof_url = ? WHERE user_id = ?")
      .bind(proofUrl, user.id)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'payment', 'Payment proof received', ?, ?)`
      )
      .bind(
        user.id,
        `We received your payment proof for the ${pkg.name} plan. An admin will verify and activate your membership shortly.`,
        paymentId
      )
      .run();

    return c.json({
      success: true,
      payment: { id: paymentId, status: "pending_verification", packageId: pkg.id },
      message: "Payment proof submitted. Awaiting admin verification.",
    });
  } catch (err: any) {
    console.error("[Payments] Manual proof error:", err);
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/payments/create-order - Create a Razorpay order for the authenticated user
app.post("/create-order", requireAuth, async (c) => {
  try {
    const user = c.get("user")!;
    const body = await c.req.json();
    const { packageId } = body;

    if (!packageId) {
      return c.json({ error: "packageId is required" }, 400);
    }

    const db = c.env.DB;

    if (!(await isRazorpayEnabled(db))) {
      return c.json(
        {
          error:
            "Online payments are temporarily disabled. Please contact support or ask an admin to activate your plan.",
        },
        403
      );
    }

    const pkg = await db
      .prepare("SELECT * FROM packages WHERE id = ? AND is_active = 1")
      .bind(Number(packageId))
      .first<{ id: number; name: string; price: number; validity_days: number; contact_limit: number }>();

    if (!pkg) {
      return c.json({ error: "Selected subscription package not found." }, 404);
    }

    const receipt = `rcpt_${user.id.substring(0, 8)}_${Date.now().toString().slice(-6)}`;
    const order = await createOrder(c.env, pkg.price, "INR", receipt, {
      userId: user.id,
      packageId: pkg.id.toString(),
      packageName: pkg.name,
    });

    // Persist package binding server-side so verify never trusts client packageId alone
    await db
      .prepare(
        `INSERT INTO payments (id, user_id, package_id, amount, status, order_id)
         VALUES (?, ?, ?, ?, 'created', ?)`
      )
      .bind(order.id, user.id, pkg.id, order.amount ?? Math.round(pkg.price * 100), order.id)
      .run();

    return c.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: c.env.RAZORPAY_KEY_ID,
      isMock: !!order.isMock,
      message: "Razorpay order initialized successfully.",
    });
  } catch (err: any) {
    console.error("[Payments] Create order error:", err);
    return c.json({ error: err?.message || "Payment Server Error" }, 500);
  }
});

/**
 * Resolve package_id for a verified order from server records / Razorpay notes.
 * Never trusts client packageId alone; if client sends one it must match.
 */
async function resolvePackageIdForOrder(
  env: Env,
  db: D1Database,
  userId: string,
  orderId: string,
  clientPackageId?: number | string | null
): Promise<{ packageId: number } | { error: string; status: 400 | 403 | 404 }> {
  const pending = await db
    .prepare(
      `SELECT user_id, package_id, status FROM payments
       WHERE order_id = ? AND status = 'created'
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(orderId)
    .first<{ user_id: string; package_id: number; status: string }>();

  let packageId: number | null = pending?.package_id ?? null;

  if (pending && pending.user_id !== userId) {
    return { error: "Order does not belong to this user", status: 403 };
  }

  // Prefer Razorpay order notes when available (authoritative for live orders)
  if (!orderId.startsWith("order_mock_")) {
    try {
      const razorpayOrder = await fetchOrder(env, orderId);
      const notesUserId = razorpayOrder?.notes?.userId;
      if (notesUserId && notesUserId !== userId) {
        return { error: "Order does not belong to this user", status: 403 };
      }
      const notesPackageId = parseInt(razorpayOrder?.notes?.packageId || "", 10);
      if (!Number.isNaN(notesPackageId) && notesPackageId > 0) {
        packageId = notesPackageId;
      }
    } catch (err) {
      console.error("[Payments] fetchOrder failed; falling back to pending record:", err);
    }
  }

  if (!packageId) {
    return { error: "Unable to resolve package for this order", status: 400 };
  }

  if (clientPackageId != null && clientPackageId !== "" && Number(clientPackageId) !== Number(packageId)) {
    return { error: "packageId does not match the order", status: 400 };
  }

  return { packageId };
}

// POST /v1/payments/verify - Client-side payment signature verification
app.post("/verify", requireAuth, async (c) => {
  const user = c.get("user")!;
  try {
    const { orderId, paymentId, signature, packageId: clientPackageId } = await c.req.json();

    if (!orderId || !paymentId || !signature) {
      return c.json({ error: "orderId, paymentId, and signature are required" }, 400);
    }

    const isValid = await verifyPaymentSignature(c.env, orderId, paymentId, signature);
    if (!isValid) {
      return c.json({ error: "Invalid payment signature" }, 400);
    }

    const db = c.env.DB;

    const existing = await db
      .prepare("SELECT id FROM payments WHERE id = ? AND status = 'captured'")
      .bind(paymentId)
      .first();
    if (existing) {
      return c.json({
        success: true,
        payment: { id: paymentId, orderId, status: "captured" },
        message: "Payment already processed.",
      });
    }

    const resolved = await resolvePackageIdForOrder(c.env, db, user.id, orderId, clientPackageId);
    if ("error" in resolved) {
      return c.json({ error: resolved.error }, resolved.status);
    }
    const packageIdToUse = resolved.packageId;

    const pkg = await db
      .prepare("SELECT * FROM packages WHERE id = ?")
      .bind(packageIdToUse)
      .first<{ id: number; name: string; price: number; validity_days: number; contact_limit: number }>();

    if (!pkg) {
      return c.json({ error: "Package bound to order not found" }, 404);
    }

    const packageName = pkg.name;
    const amountInPaise = pkg.price * 100;
    const days = pkg.validity_days;
    const contactLimit = pkg.contact_limit;

    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // Clear pending placeholder row (id was the order id)
    await db
      .prepare("DELETE FROM payments WHERE order_id = ? AND status = 'created'")
      .bind(orderId)
      .run();

    await db
      .prepare(
        "INSERT OR REPLACE INTO payments (id, user_id, package_id, amount, status, order_id) VALUES (?, ?, ?, ?, 'captured', ?)"
      )
      .bind(paymentId, user.id, packageIdToUse, amountInPaise, orderId)
      .run();

    await db
      .prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
      .bind(user.id)
      .run();

    await db
      .prepare(
        `INSERT INTO user_subscriptions (user_id, package_id, start_date, end_date, status, payment_id, contact_limit_balance)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(user.id, packageIdToUse, startDate, endDate, paymentId, contactLimit)
      .run();

    await db
      .prepare("UPDATE profiles SET is_featured = ? WHERE user_id = ?")
      .bind(packageIdToUse >= 2 ? 1 : 0, user.id)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'payment', 'Payment Confirmed', ?, ?)`
      )
      .bind(
        user.id,
        `We've received your payment for the ${packageName} Plan. Premium features have been unlocked!`,
        paymentId
      )
      .run();

    return c.json({
      success: true,
      payment: { id: paymentId, orderId, status: "captured" },
      subscription: { endDate, contactLimitBalance: contactLimit },
    });
  } catch (err: any) {
    console.error("[Payments] Verify error:", err);
    return c.json({ error: err?.message || "Payment verification failed" }, 500);
  }
});

// POST /v1/payments/webhook - Razorpay server-to-server webhook
app.post("/webhook", async (c) => {
  try {
    const rawBody = await c.req.text();
    const body = JSON.parse(rawBody);
    const { event, payload } = body;
    const signature = c.req.header("x-razorpay-signature") || "";

    if (!c.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error("[WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured");
      return c.json({ error: "Webhook secret not configured" }, 500);
    }

    if (!signature) {
      return c.json({ error: "Missing webhook signature" }, 403);
    }

    const isValid = await verifyWebhookSignature(c.env, rawBody, signature);
    if (!isValid) {
      console.error("[WEBHOOK] Signature verification failed");
      return c.json({ error: "Invalid webhook signature" }, 403);
    }

    if (event !== "payment.captured" && event !== "order.paid") {
      return c.json({ success: true, message: "Unhandled webhook event ignored." });
    }

    const paymentEntity = payload?.payment?.entity;
    if (!paymentEntity) {
      return c.json({ success: true, message: "No payment entity in webhook payload." });
    }

    const db = c.env.DB;
    const paymentId = paymentEntity.id;
    const orderId = paymentEntity.order_id;
    const amountInPaise = paymentEntity.amount;
    const amountInINR = amountInPaise / 100;

    const userId = paymentEntity.notes?.userId;
    // Prefer notes from payment; fall back to pending payment row created at order time
    let packageId = parseInt(paymentEntity.notes?.packageId || "", 10);
    let packageName = paymentEntity.notes?.packageName || "Premium";

    if (!userId) {
      console.error("[WEBHOOK] Missing userId in order notes", paymentEntity);
      return c.json({ error: "Missing userId in order notes" }, 400);
    }

    if (Number.isNaN(packageId) || packageId <= 0) {
      const pending = await db
        .prepare(
          `SELECT package_id FROM payments WHERE order_id = ? AND status = 'created' LIMIT 1`
        )
        .bind(orderId)
        .first<{ package_id: number }>();
      if (pending?.package_id) {
        packageId = pending.package_id;
      } else {
        return c.json({ error: "Missing packageId in order notes" }, 400);
      }
    }

    const existing = await db
      .prepare("SELECT id FROM payments WHERE id = ? AND status = 'captured'")
      .bind(paymentId)
      .first();
    if (existing) {
      return c.json({ success: true, message: "Payment already processed." });
    }

    const pkg = await db
      .prepare("SELECT * FROM packages WHERE id = ?")
      .bind(packageId)
      .first<{ id: number; name: string; validity_days: number; contact_limit: number }>();

    if (pkg?.name) packageName = pkg.name;
    const days = pkg?.validity_days || 90;
    const contactLimit = pkg?.contact_limit || 20;

    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await db
      .prepare("DELETE FROM payments WHERE order_id = ? AND status = 'created'")
      .bind(orderId)
      .run();

    await db
      .prepare(
        "INSERT INTO payments (id, user_id, package_id, amount, status, order_id) VALUES (?, ?, ?, ?, 'captured', ?)"
      )
      .bind(paymentId, userId, packageId, amountInPaise, orderId)
      .run();

    await db
      .prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
      .bind(userId)
      .run();

    await db
      .prepare(
        `INSERT INTO user_subscriptions (user_id, package_id, start_date, end_date, status, payment_id, contact_limit_balance)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(userId, packageId, startDate, endDate, paymentId, contactLimit)
      .run();

    await db
      .prepare("UPDATE profiles SET is_featured = ? WHERE user_id = ?")
      .bind(packageId >= 2 ? 1 : 0, userId)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'payment', 'Payment Confirmed', ?, ?)`
      )
      .bind(
        userId,
        `We've received Rs. ${amountInINR} for your ${packageName} Plan. Premium features have been unlocked!`,
        paymentId
      )
      .run();

    const userRow = await db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string | null }>();

    if (userRow?.email) {
      try {
        await sendTemplatedEmail(c.env, userRow.email, "payment_confirmed", {
          name: "Member",
          amount: amountInINR,
          packageName,
          expiryDate: new Date(endDate).toLocaleDateString("en-IN"),
          contactLimit,
          paymentId,
          orderId,
        });
      } catch (err) {
        console.error("[Payments] Email send failed:", err);
      }
    }

    return c.json({
      success: true,
      message: "Webhook processed and package subscription activated successfully.",
    });
  } catch (err: any) {
    console.error("[Payments] Webhook error:", err);
    return c.json({ error: err?.message || "Webhook Server Error" }, 500);
  }
});

// POST /v1/payments/subscription/cancel - Cancels the current user's active subscription
app.post("/subscription/cancel", requireAuth, async (c) => {
  const user = c.get("user")!;
  try {
    const db = c.env.DB;

    await db
      .prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
      .bind(user.id)
      .run();

    return c.json({ success: true, message: "Subscription cancelled successfully." });
  } catch (err: any) {
    console.error("[Payments] Cancel subscription error:", err);
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;

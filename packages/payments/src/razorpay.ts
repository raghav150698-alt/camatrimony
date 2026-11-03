/**
 * Edge-Compatible Razorpay Payment Processor.
 * Uses native fetch() and standard Web Crypto APIs, avoiding heavy, Node-only SDK packages.
 */

// Helper to check if credentials are set
const hasKeys = () => {
  return (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );
};

// Base64 helper for Basic Auth
const getAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
};

/**
 * Creates a real or mock Razorpay order.
 */
export async function createOrder(
  amount: number, // in INR rupees
  currency: string = "INR",
  receipt: string,
  notes: Record<string, string> = {}
) {
  const amountInPaise = Math.round(amount * 100);

  if (!hasKeys()) {
    throw new Error("Razorpay keys are not configured");
  }

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay API Error: ${errText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error("Razorpay order creation failed:", err);
    throw err;
  }
}

/**
 * Verifies Razorpay Payment/Webhook signatures using standard Web Crypto APIs (fully Edge-compatible!).
 */
export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  // Checkout signatures use the API key secret (not the webhook secret).
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }

  try {
    const textEncoder = new TextEncoder();
    const keyData = textEncoder.encode(secret);
    const messageData = textEncoder.encode(`${orderId}|${paymentId}`);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

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
 * Initiates a full or partial refund via Razorpay.
 */
export async function processRefund(
  paymentId: string,
  amount?: number, // Optional, defaults to full refund
  notes: Record<string, string> = {}
) {
  if (!hasKeys()) {
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
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay Refund Error: ${errText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error("Razorpay refund process failed:", err);
    throw err;
  }
}

/**
 * Fetches transaction log detail.
 */
export async function fetchPayment(paymentId: string) {
  if (!hasKeys()) {
    throw new Error("Razorpay keys are not configured");
  }

  try {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error("Razorpay Payment Fetch Failed");
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to fetch Razorpay payment log:", err);
    throw err;
  }
}

/**
 * Client-side Razorpay Checkout SDK loader.
 * Loads the Razorpay checkout.js script and opens the checkout modal.
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Loads the Razorpay checkout.js script tag dynamically.
 * Caches the promise to avoid duplicate script injections.
 */
export function loadRazorpayScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Razorpay checkout can only be loaded in browser environment"));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout script"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface CheckoutOptions {
  key: string;
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Opens the Razorpay checkout modal with the given options.
 * Automatically loads the script if not already loaded.
 */
export async function openCheckout(options: CheckoutOptions): Promise<void> {
  await loadRazorpayScript();

  if (typeof window === "undefined" || !window.Razorpay) {
    throw new Error("Razorpay checkout SDK is not available");
  }

  const rzp = new window.Razorpay({
    key: options.key,
    order_id: options.orderId,
    amount: options.amount,
    currency: options.currency || "INR",
    name: options.name || "CA Matrimony BNCN",
    description: options.description || "Premium Subscription Plan",
    image: options.image,
    prefill: options.prefill,
    notes: options.notes,
    theme: options.theme || { color: "#7b1e1e" },
    handler: options.handler,
    modal: options.modal || {
      ondismiss: () => {},
      escape: true,
      backdropclose: false,
    },
  });

  rzp.on("payment.failed", (err: any) => {
    console.error("Razorpay payment failed:", err.error);
  });

  rzp.open();
}

/**
 * Gets the Razorpay public key from environment.
 */
export function getRazorpayKey(): string {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    ""
  );
}

/** Session key for preserving ?next= across Google redirect sign-in. */
import { safeNextPath } from "./auth-routing";
export const AUTH_NEXT_KEY = "camatrimony_auth_next";

export function stashAuthNextFromUrl(): void {
  if (typeof window === "undefined") return;
  const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
  if (next) {
    sessionStorage.setItem(AUTH_NEXT_KEY, next);
  }
}

export function clearStashedAuthNext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_NEXT_KEY);
}

function readStashedAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  const next = safeNextPath(sessionStorage.getItem(AUTH_NEXT_KEY));
  if (next) return next;
  return null;
}

/** Safe post-auth destination from ?next= or stashed redirect next. */
export function resolvePostAuthPath(isOnboardingCompleted: boolean): string {
  let next: string | null = null;
  if (typeof window !== "undefined") {
    next = safeNextPath(new URLSearchParams(window.location.search).get("next")) || readStashedAuthNext();
  }
  if (next && /^\/(login|register|onboarding)(\/|\?|$)/.test(next)) next = null;
  if (!isOnboardingCompleted) return next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
  return next || "/dashboard";
}

/**
 * Normalize Indian / E.164 phone input for Firebase Phone Auth.
 * Accepts "+91…", "91…", bare 10-digit mobiles, and common spacing/dashes.
 */
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.replace(/[^\d+]/g, "").trim();
  if (!trimmed) return "";

  const onlyDigits = trimmed.replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(onlyDigits)) {
    // 10-digit Indian mobile without country code
    return `+91${onlyDigits}`;
  }
  if (/^0[6-9]\d{9}$/.test(onlyDigits)) {
    // Leading 0 local format
    return `+91${onlyDigits.slice(1)}`;
  }
  if (/^91[6-9]\d{9}$/.test(onlyDigits)) {
    return `+${onlyDigits}`;
  }
  // E.164: leading + or bare country-code digits
  return `+${onlyDigits}`;
}

/** Friendlier Firebase Auth error copy for login/register UI. */
export function formatAuthError(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code || "") : "";
  const messages: Record<string, string> = {
    "auth/too-many-requests": "Too many attempts. Please wait a little, or try Google sign-in.",
    "auth/quota-exceeded": "Mobile sign-in is temporarily unavailable. Please try Google sign-in.",
    "auth/billing-not-enabled": "Mobile sign-in is temporarily unavailable. Please try Google sign-in.",
    "auth/operation-not-allowed": "This sign-in method is unavailable. Try another method or contact support.",
    "auth/captcha-check-failed": "Verification expired. Refresh the page and try again.",
    "auth/invalid-app-credential": "Verification could not start. Refresh the page or try Google sign-in.",
    "auth/app-not-authorized": "Sign-in is unavailable on this address. Please contact support.",
    "auth/popup-blocked": "Please allow the sign-in window, or use mobile OTP.",
    "auth/popup-closed-by-user": "Sign-in was cancelled. You can try again.",
    "auth/invalid-verification-code": "That code doesn’t match. Check the six digits and try again.",
    "auth/code-expired": "This code has expired. Request a new one.",
    "auth/invalid-phone-number": "Enter a valid mobile number with its country code.",
    "auth/missing-phone-number": "Enter your mobile number.",
    "auth/network-request-failed": "Check your connection and try again.",
  };
  if (messages[code]) return messages[code];
  if (err instanceof Error && err.message.startsWith("Local review")) return err.message;
  return "We couldn’t sign you in. Please try again or contact support.";
}

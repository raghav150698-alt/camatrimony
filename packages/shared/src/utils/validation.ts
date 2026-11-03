/**
 * Validates an Indian phone number.
 * Accepts formats: +91 XXXXX XXXXX, 91XXXXXXXXXX, XXXXX XXXXX, XXXXXXXXXX
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-+]/g, "");
  // Indian phone numbers: 10 digits, optionally prefixed with 91
  const phoneRegex = /^(91)?[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validates an email address.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formats a phone number to a consistent display format: +91 XXXXX XXXXX
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-+]/g, "");
  const digits = cleaned.startsWith("91") ? cleaned.slice(2) : cleaned;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

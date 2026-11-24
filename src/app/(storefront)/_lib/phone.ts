/**
 * Indian mobile numbers as customers type them. Accepts +91 / 91 / a leading 0, spaces and dashes; returns
 * the 10 digits, or null if it isn't a mobile number (those start with 6, 7, 8 or 9). Checked before any
 * SMS is sent.
 */
export function normalizeIndianMobile(input: string): string | null {
  const trimmed = String(input ?? "").trim();
  if (!/^\+?[\d\s-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("91")) return null;
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** 10 digits → the E.164 form Firebase expects, e.g. "+919876543210". */
export const toE164 = (tenDigits: string): string => `+91${tenDigits}`;

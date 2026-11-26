/** Customer accounts sign in with an email and a password (Firebase email/password auth). */

/** Firebase's own minimum is 6; ask for a little more. */
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVALID_EMAIL = "Enter a valid email address.";

/** The email a customer typed, trimmed and lowercased; null if it isn't an email. */
export function parseEmail(input: string): string | null {
  const value = String(input ?? "").trim().toLowerCase();
  return EMAIL.test(value) ? value : null;
}

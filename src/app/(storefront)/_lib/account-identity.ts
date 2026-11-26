/**
 * Customer accounts sign in with a username or an email, plus a password (Firebase email/password auth).
 *
 * Firebase only knows emails, so a username account signs in with a stand-in address on a domain that never
 * receives mail: `priya_k` → `priya_k@customers.reshmam.com`. Firebase keeps emails unique, so usernames are
 * unique too. A username can't contain "@", so the two never collide. The Firestore rules repeat this domain.
 */
export const USERNAME_EMAIL_DOMAIN = "customers.reshmam.com";

/** Firebase's own minimum is 6; ask for a little more. */
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 3–30 lowercase letters, digits, dots and underscores, starting with a letter or digit. */
const USERNAME = /^[a-z0-9][a-z0-9._]{2,29}$/;

export type Identifier = { kind: "email"; email: string } | { kind: "username"; username: string };

export const INVALID_IDENTIFIER =
  "Enter a valid email, or a username of 3–30 letters, numbers, dots or underscores.";

/** What a customer typed in "Username or email", tidied; null if it is neither. */
export function parseIdentifier(input: string): Identifier | null {
  const value = String(input ?? "").trim().toLowerCase();
  if (value.includes("@")) return EMAIL.test(value) ? { kind: "email", email: value } : null;
  return USERNAME.test(value) ? { kind: "username", username: value } : null;
}

/** The address Firebase signs this account in with. */
export function authEmail(id: Identifier): string {
  return id.kind === "email" ? id.email : `${id.username}@${USERNAME_EMAIL_DOMAIN}`;
}

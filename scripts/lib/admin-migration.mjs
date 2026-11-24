import { randomBytes } from "node:crypto";
// Pure planning for scripts/migrate-admin-users.mjs: which staff keep their password, which must reset it,
// and the settings document with every password removed, plus linking each one to a Firebase Auth account
// (the Auth client is passed in, so both are unit-tested).

/** The admin panel's old demo passwords: never carried over to a real account. */
export const SEED_PASSWORDS = ["Admin@123", "Manager@123", "Staff@123"];

/** Removes every `password` key, at any depth. */
export function withoutPasswords(value) {
  if (Array.isArray(value)) return value.map(withoutPasswords);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== "password")
        .map(([k, v]) => [k, withoutPasswords(v)]),
    );
  }
  return value;
}

/**
 * @param {Array<Record<string, unknown>>} adminUsers  current adminUsers documents ({ id, email, password?, ... })
 * @param {Record<string, unknown> | null} configsSettings  current configs/settings document
 */
export function planMigration(adminUsers, configsSettings) {
  const users = [];
  const mustReset = [];
  const skipped = [];
  for (const u of adminUsers) {
    const email = String(u.email ?? "").trim().toLowerCase();
    if (!email) {
      skipped.push(String(u.id));
      continue;
    }
    const alreadyMigrated = Boolean(u.migratedAt);
    const password = typeof u.password === "string" ? u.password : "";
    const keepPassword = !alreadyMigrated && password.length >= 6 && !SEED_PASSWORDS.includes(password);
    if (!keepPassword && !alreadyMigrated) mustReset.push(email);
    const { id: _id, password: _pw, ...rest } = u;
    users.push({ oldId: String(u.id), email, keepPassword, alreadyMigrated, record: withoutPasswords({ ...rest, email }) });
  }
  let scrubbedSettings = null;
  if (configsSettings) {
    const { users: _users, ...rest } = configsSettings;
    scrubbedSettings = withoutPasswords(rest);
  }
  return { users, mustReset, skipped, scrubbedSettings };
}

/**
 * The Firebase Auth account for one staff member. A new account gets `password`. An account that already
 * exists for the email was not made by this script (anyone can sign up an email/password account once that
 * sign-in method is on), so it is never trusted as it is: it gets a random password, its sessions are
 * revoked and the staff member must use Forgot password (`reset: true`).
 * @param {{ getUserByEmail: Function, createUser: Function, updateUser: Function, revokeRefreshTokens: Function }} auth
 * @param {{ email: string, record: Record<string, unknown> }} staff
 * @param {string} password
 */
export async function linkAuthUser(auth, staff, password) {
  const disabled = staff.record.status !== "Active";
  let existing = null;
  try {
    existing = await auth.getUserByEmail(staff.email);
  } catch (e) {
    if (e?.code !== "auth/user-not-found") throw e;
  }
  if (!existing) {
    const user = await auth.createUser({ email: staff.email, displayName: String(staff.record.name ?? ""), password, disabled });
    return { uid: user.uid, reset: false };
  }
  await auth.updateUser(existing.uid, { password: randomBytes(24).toString("base64url"), emailVerified: false, disabled });
  await auth.revokeRefreshTokens(existing.uid);
  return { uid: existing.uid, reset: true };
}

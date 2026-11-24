#!/usr/bin/env node
/**
 * One-time move of admin staff to Firebase Auth (see docs/firebase-go-live.md).
 *
 * For each document in `adminUsers`:
 *  - creates (or finds) a Firebase Auth email/password user,
 *  - keeps the current password only if it isn't one of the old demo passwords; otherwise sets a random one
 *    and lists the email under "must use Forgot password",
 *  - writes the record to adminUsers/{Firebase uid} without the password and deletes the old document.
 * Also removes the staff list and every password from configs/settings.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT='<service-account JSON>' node scripts/migrate-admin-users.mjs           # dry run
 *   FIREBASE_SERVICE_ACCOUNT='<service-account JSON>' node scripts/migrate-admin-users.mjs --apply   # write
 * Safe to run again: staff already migrated are skipped. A sign-in account that already exists for a staff
 * email is never trusted as is: its password is reset and its sessions ended. Never prints a password.
 */
import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { linkAuthUser, planMigration } from "./lib/admin-migration.mjs";

const apply = process.argv.includes("--apply");
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Set FIREBASE_SERVICE_ACCOUNT (or run against the emulator with FIRESTORE_EMULATOR_HOST).");
  process.exit(1);
}
const app = raw ? initializeApp({ credential: cert(JSON.parse(raw)) }, "admin-migration") : initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-reshmam" }, "admin-migration");
const db = getFirestore(app);
const auth = getAuth(app);

const usersSnap = await db.collection("adminUsers").get();
const settingsSnap = await db.collection("configs").doc("settings").get();
const plan = planMigration(
  usersSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
  settingsSnap.exists ? settingsSnap.data() : null,
);

console.log(`${apply ? "APPLYING" : "DRY RUN"}: ${plan.users.length} staff, ${plan.skipped.length} skipped (no email)`);
for (const u of plan.users) {
  console.log(`  ${u.email.padEnd(32)} ${String(u.record.role ?? "").padEnd(8)} ${String(u.record.status ?? "").padEnd(8)} ${u.alreadyMigrated ? "already migrated" : u.keepPassword ? "keeps password" : "must use Forgot password"}`);
}
if (plan.skipped.length) console.log(`  skipped ids: ${plan.skipped.join(", ")}`);
if (!apply) {
  console.log("\nNothing written. Re-run with --apply to migrate.");
  process.exit(0);
}

const original = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));
for (const u of plan.users) {
  if (u.alreadyMigrated) continue;
  const password = u.keepPassword ? String(original.get(u.oldId)?.password) : randomBytes(24).toString("base64url");
  const { uid, reset } = await linkAuthUser(auth, u, password);
  if (reset && !plan.mustReset.includes(u.email)) plan.mustReset.push(u.email);
  const now = new Date().toISOString();
  await db.collection("adminUsers").doc(uid).set({ ...u.record, id: uid, migratedAt: now, updatedAt: now });
  if (u.oldId !== uid) await db.collection("adminUsers").doc(u.oldId).delete();
  console.log(`  migrated ${u.email} -> ${uid}${reset ? " (existing sign-in account: password reset, sessions ended)" : ""}`);
}
if (plan.scrubbedSettings) {
  await db.collection("configs").doc("settings").set(plan.scrubbedSettings);
  console.log("  configs/settings: staff list and passwords removed");
}
console.log(`\nDone. Send password reset links to:\n  ${plan.mustReset.join("\n  ") || "(nobody)"}`);

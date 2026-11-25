#!/usr/bin/env node
/**
 * Loads the admin panel's sample data and demo staff logins into the LOCAL Firebase emulators, for
 * `npm run dev:demo`. Refuses to run unless both emulators are set, so it can never touch the live project.
 *
 *   admin@reshmam.com / Admin@123      (Admin)
 *   manager@reshmam.com / Manager@123  (Manager)
 *   staff@reshmam.com / Staff@123      (Staff)
 */
import { register } from "node:module";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { demoDocuments } from "./lib/demo-data.mjs";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("seed-demo only runs against the Firebase emulators. Use `npm run dev:demo`.");
  process.exit(1);
}

register("./lib/demo-hooks.mjs", import.meta.url);
const { buildSeed } = await import("../src/app/admin/_lib/seed.js");
const { collections, configs, staff } = demoDocuments(buildSeed());

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || "reshmam-oil" }, "seed-demo");
const db = getFirestore(app);
const auth = getAuth(app);

// Firestore batches hold at most 500 writes.
let batch = db.batch();
let pending = 0;
const put = async (ref, data) => {
  batch.set(ref, data);
  if (++pending === 500) {
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }
};

const now = new Date().toISOString();
for (const s of staff) {
  const existing = await auth.getUserByEmail(s.email).catch(() => null);
  const props = { email: s.email, password: s.password, displayName: s.record.name, disabled: s.record.status !== "Active" };
  const user = existing ? await auth.updateUser(existing.uid, props) : await auth.createUser(props);
  await put(db.collection("adminUsers").doc(user.uid), { ...s.record, id: user.uid, createdAt: now, updatedAt: now });
}
for (const [col, docs] of Object.entries(collections)) {
  for (const d of docs) await put(db.collection(col).doc(String(d.id)), d);
}
for (const [key, data] of Object.entries(configs)) await put(db.collection("configs").doc(key), data);
if (pending) await batch.commit();

const counts = Object.entries(collections).map(([c, d]) => `${c} ${d.length}`).join(", ");
console.log(`\nDemo data loaded into the emulators: ${counts}.`);
console.log("Admin panel demo logins (this computer only):");
for (const s of staff.filter((x) => x.record.status === "Active")) console.log(`  ${s.email.padEnd(24)} ${s.password.padEnd(12)} ${s.record.role}`);

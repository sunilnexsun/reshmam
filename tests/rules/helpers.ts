// Test plumbing for the security-rules tests: one Firebase client per identity (signed in with an emulator
// mock token), and the Admin SDK for seeding data, which bypasses the rules.
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { expect } from "vitest";

export const PROJECT_ID = "demo-reshmam";
const BUCKET = `${PROJECT_ID}.appspot.com`;
const [FS_HOST, FS_PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
const [ST_HOST, ST_PORT] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199").split(":");

export type Identity = { uid: string; phone?: string } | null;

const apps: FirebaseApp[] = [];
let n = 0;

/** A Firestore + Storage client acting as `who` (null = signed out). */
export function client(who: Identity): { db: Firestore; storage: FirebaseStorage } {
  const app = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-key", storageBucket: BUCKET }, `rules-${n++}`);
  apps.push(app);
  const token = who ? { sub: who.uid, user_id: who.uid, ...(who.phone ? { phone_number: who.phone } : {}) } : undefined;
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FS_HOST, Number(FS_PORT), token ? { mockUserToken: token } : {});
  const storage = getStorage(app);
  connectStorageEmulator(storage, ST_HOST, Number(ST_PORT), token ? { mockUserToken: token } : {});
  return { db, storage };
}

/** Admin Firestore for seeding (no rules). */
export function seedDb() {
  const app = getAdminApps().find((a) => a.name === "rules-seed") ?? initAdmin({ projectId: PROJECT_ID }, "rules-seed");
  return getAdminFirestore(app);
}

export async function clearFirestore() {
  const res = await fetch(`http://${FS_HOST}:${FS_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Could not clear the Firestore emulator: ${res.status}`);
}

export async function closeClients() {
  await Promise.all(apps.splice(0).map((a) => deleteApp(a)));
}

/** The operation is allowed by the rules. */
export const allowed = (p: Promise<unknown>) => expect(p).resolves.not.toThrow();
/** The operation is refused by the rules. */
export const denied = async (p: Promise<unknown>) => {
  const err = await p.then(
    () => null,
    (e: { code?: string }) => e,
  );
  expect(err, "expected permission-denied, but the operation was allowed").not.toBeNull();
  expect(String(err?.code)).toMatch(/permission-denied|unauthorized/);
};

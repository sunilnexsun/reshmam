import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { db as clientDb } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Returns the Firebase Admin Firestore instance when configured (or mocked in tests),
 * or null if FIREBASE_SERVICE_ACCOUNT is not set so callers can fall back to the
 * public client SDK.
 */
function tryAdminDb() {
  const hasAdminEnv =
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT) ||
    Boolean(process.env.VITEST) ||
    (process.env.NODE_ENV !== "production" &&
      Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST));
  if (!hasAdminEnv) return null;
  try {
    return adminDb();
  } catch {
    return null;
  }
}

export async function getDocData(
  col: string,
  id: string,
): Promise<{ exists: boolean; id: string; data: Record<string, any> | undefined }> {
  const admin = tryAdminDb();
  if (admin) {
    const snap = await admin.collection(col).doc(id).get();
    return {
      exists: snap.exists,
      id: snap.id,
      data: snap.data() as Record<string, any> | undefined,
    };
  }
  const snap = await getDoc(doc(clientDb, col, id));
  return {
    exists: snap.exists(),
    id: snap.id,
    data: snap.exists() ? (snap.data() as Record<string, any>) : undefined,
  };
}

export async function setDocData(
  col: string,
  id: string,
  data: Record<string, any>,
  opts?: { merge?: boolean },
): Promise<void> {
  const admin = tryAdminDb();
  if (admin) {
    if (opts?.merge) {
      await admin.collection(col).doc(id).set(data, { merge: true });
    } else {
      await admin.collection(col).doc(id).set(data);
    }
    return;
  }
  if (opts?.merge) {
    await setDoc(doc(clientDb, col, id), data, { merge: true });
  } else {
    await setDoc(doc(clientDb, col, id), data);
  }
}

export async function updateDocData(
  col: string,
  id: string,
  data: Record<string, any>,
): Promise<void> {
  const admin = tryAdminDb();
  if (admin) {
    await admin.collection(col).doc(id).update(data);
    return;
  }
  await updateDoc(doc(clientDb, col, id), data);
}

export async function findDocByField(
  col: string,
  field: string,
  value: string,
): Promise<{ id: string; data: Record<string, any> } | null> {
  const admin = tryAdminDb();
  if (admin) {
    const snap = await admin.collection(col).where(field, "==", value).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, data: d.data() as Record<string, any> };
  }
  const snap = await getDocs(query(collection(clientDb, col), where(field, "==", value), limit(1)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() as Record<string, any> };
}

import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { firebaseConfig } from "./firebase-config";

/**
 * Firebase Admin SDK for server routes. It bypasses Firestore security rules, so every route that uses it
 * must do its own checks (see src/lib/staff-auth.ts and src/lib/staff-permissions.ts).
 *
 * Credentials come only from FIREBASE_SERVICE_ACCOUNT: the service-account JSON as one string. For local
 * testing only (never in production), FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST without credentials
 * point it at the Firebase emulators instead.
 */

const APP_NAME = "reshmam-admin-server";

export class FirebaseAdminNotConfigured extends Error {
  constructor() {
    super("FIREBASE_SERVICE_ACCOUNT is not set, so the Firebase Admin SDK is unavailable.");
    this.name = "FirebaseAdminNotConfigured";
  }
}

let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    app = existing;
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const isEmulator =
    process.env.NODE_ENV !== "production" &&
    Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

  if (raw) {
    app = initializeApp({ credential: cert(JSON.parse(raw)) }, APP_NAME);
    return app;
  }
  if (isEmulator) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "reshmam-oil";
    app = initializeApp({ projectId }, APP_NAME);
    return app;
  }
  throw new FirebaseAdminNotConfigured();
}

export const adminDb = (): Firestore => getFirestore(adminApp());
export const adminAuth = (): Auth => getAuth(adminApp());
export const adminStorage = (): Storage => getStorage(adminApp());
export const adminBucket = () => adminStorage().bucket(firebaseConfig.storageBucket);

/** The token from an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(req: Request): string | null {
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  return token || null;
}

/**
 * The caller's verified Firebase ID token, or null when it's missing, malformed, expired, forged or the
 * Admin SDK isn't configured. Never throws.
 */
export async function verifyIdToken(req: Request): Promise<DecodedIdToken | null> {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

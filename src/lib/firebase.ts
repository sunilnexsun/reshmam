import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

import { firebaseConfig } from "./firebase-config";

export { firebaseConfig };

/** The default app (the storefront's customer sign-in uses its own named app, which may already exist). */
export const app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

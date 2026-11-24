import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

import { firebaseConfig } from "./firebase-config";

export { firebaseConfig };

function getFirebaseApp() {
  try {
    const apps = getApps();
    if (apps.length > 0) {
      return getApp();
    }
    return initializeApp(firebaseConfig);
  } catch {
    try {
      return getApp();
    } catch {
      return initializeApp(firebaseConfig);
    }
  }
}

export const app = getFirebaseApp();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

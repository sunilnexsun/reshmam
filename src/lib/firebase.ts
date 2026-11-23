import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDWfC3Z-5nYzmDKIoLRwRCAkCQhIKQH8LI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "reshmam-oil.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "reshmam-oil",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "reshmam-oil.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "245127746311",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:245127746311:web:fb9041eea8686cb0e06ba2",
};

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

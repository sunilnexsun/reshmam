"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase-config";

/**
 * The storefront's own Firebase app, so a customer's sign-in never mixes with an admin panel
 * staff session open in the same browser.
 */
const APP_NAME = "reshmam-customer";

const existing = getApps().some((a) => a.name === APP_NAME);
const customerApp = existing ? getApp(APP_NAME) : initializeApp(firebaseConfig, APP_NAME);

export const customerAuth = getAuth(customerApp);
export const customerDb = getFirestore(customerApp);

// Local testing only: NEXT_PUBLIC_FIREBASE_EMULATORS=1 (with `firebase emulators:start`) signs customers in
// against the Auth and Firestore emulators (password-reset emails appear in the emulator UI).
if (!existing && process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" && process.env.NODE_ENV !== "production") {
  connectAuthEmulator(customerAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(customerDb, "127.0.0.1", 8080);
}

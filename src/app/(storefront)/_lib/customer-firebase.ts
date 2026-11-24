"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase-config";

/**
 * The storefront's own Firebase app, so a customer's phone sign-in never mixes with an admin panel
 * staff session open in the same browser.
 */
const APP_NAME = "reshmam-customer";

const customerApp = getApps().some((a) => a.name === APP_NAME) ? getApp(APP_NAME) : initializeApp(firebaseConfig, APP_NAME);

export const customerAuth = getAuth(customerApp);
export const customerDb = getFirestore(customerApp);

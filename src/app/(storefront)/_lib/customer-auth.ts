"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { customerAuth, customerDb } from "./customer-firebase";
import type { CartItem } from "./store";

/** customers/{uid}: the fields the Firestore rules let a customer create and see. */
export type CustomerProfile = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  cart?: CartItem[];
  wishlist?: string[];
  createdAt: string;
  updatedAt: string;
  source: "website";
};

const MESSAGES: Record<string, string> = {
  "auth/invalid-verification-code": "That code isn't right. Check the SMS and try again.",
  "auth/code-expired": "That code has expired. Tap Resend OTP for a new one.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
  "auth/network-request-failed": "You seem to be offline. Check your connection and try again.",
};

/** What to show a customer for a Firebase Auth error code. */
export function authErrorMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

const profileRef = (uid: string) => doc(customerDb, "customers", uid);
const cleanEmail = (email?: string) => (email ?? "").trim().toLowerCase();

export async function getProfile(uid: string): Promise<CustomerProfile | null> {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? (snap.data() as CustomerProfile) : null;
}

/** First sign-in: creates customers/{uid} with the verified phone number (the rules check it matches). */
export async function createProfile(user: User, { name, email }: { name: string; email?: string }): Promise<void> {
  if (!user.phoneNumber) throw new Error("This account has no verified mobile number.");
  const now = new Date().toISOString();
  const profile: Required<CustomerProfile> = {
    id: user.uid,
    name: name.trim(),
    email: cleanEmail(email),
    phone: user.phoneNumber,
    cart: [],
    wishlist: [],
    createdAt: now,
    updatedAt: now,
    source: "website",
  };
  await setDoc(profileRef(user.uid), profile);
}

/** My Account edits: name and email only (the mobile number is the sign-in and can't change here). */
export async function updateProfile(uid: string, changes: { name?: string; email?: string }): Promise<void> {
  const data: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (changes.name !== undefined) data.name = changes.name.trim();
  if (changes.email !== undefined) data.email = cleanEmail(changes.email);
  await updateDoc(profileRef(uid), data);
}

export const signOutCustomer = (): Promise<void> => signOut(customerAuth);

/** The signed-in customer and their profile, kept live. `loading` is true until both are known. */
export function useCustomer(): { user: User | null; profile: CustomerProfile | null; loading: boolean } {
  const [state, setState] = useState<{ user: User | null; profile: CustomerProfile | null; loading: boolean }>({
    user: null,
    profile: null,
    loading: true,
  });
  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(customerAuth, (user) => {
      stopProfile?.();
      stopProfile = undefined;
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      setState((s) => ({ ...s, user, loading: true }));
      stopProfile = onSnapshot(
        profileRef(user.uid),
        (snap) => setState({ user, profile: snap.exists() ? (snap.data() as CustomerProfile) : null, loading: false }),
        () => setState({ user, profile: null, loading: false }),
      );
    });
    return () => {
      stopProfile?.();
      stopAuth();
    };
  }, []);
  return state;
}

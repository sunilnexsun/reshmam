"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { customerAuth, customerDb } from "./customer-firebase";
import type { CartItem } from "./store";
import { MIN_PASSWORD_LENGTH } from "./account-identity";
import { toE164 } from "./phone";

/** customers/{uid}: the fields the Firestore rules let a customer create and see. */
export type CustomerProfile = {
  id: string;
  name: string;
  email?: string;
  /** E.164, e.g. "+919876543210". Typed at sign-up, not verified. */
  phone: string;
  cart?: CartItem[];
  wishlist?: string[];
  createdAt: string;
  updatedAt: string;
  source: "website";
};

const WRONG_LOGIN = "That email or password isn't right.";
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": WRONG_LOGIN,
  "auth/invalid-login-credentials": WRONG_LOGIN,
  "auth/wrong-password": WRONG_LOGIN,
  "auth/user-not-found": WRONG_LOGIN,
  "auth/invalid-email": WRONG_LOGIN,
  "auth/email-already-in-use": "That email already has an account. Try logging in instead.",
  "auth/weak-password": `Choose a stronger password of at least ${MIN_PASSWORD_LENGTH} characters.`,
  "auth/password-does-not-meet-requirements": `Choose a stronger password of at least ${MIN_PASSWORD_LENGTH} characters.`,
  "auth/user-disabled": "This account has been turned off. Please contact us for help.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "You seem to be offline. Check your connection and try again.",
};

/** What to show a customer for a Firebase Auth error code. */
export function authErrorMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

const profileRef = (uid: string) => doc(customerDb, "customers", uid);

export async function getProfile(uid: string): Promise<CustomerProfile | null> {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? (snap.data() as CustomerProfile) : null;
}

/**
 * A new account's customers/{uid}: the email it signs in with (the rules check it matches the sign-in) and
 * the mobile number as typed (10 digits). The name is added later, at checkout or on My Account.
 */
export async function createProfile(uid: string, { email, phone }: { email: string; phone: string }): Promise<void> {
  const now = new Date().toISOString();
  const profile: Required<CustomerProfile> = {
    id: uid,
    name: "",
    email,
    phone: toE164(phone),
    cart: [],
    wishlist: [],
    createdAt: now,
    updatedAt: now,
    source: "website",
  };
  await setDoc(profileRef(uid), profile);
}

/** My Account edits: the name only (the email is the login, and the mobile number can't change here). */
export async function updateProfile(uid: string, changes: { name: string }): Promise<void> {
  const data: Record<string, string> = { updatedAt: new Date().toISOString(), name: changes.name.trim() };
  await updateDoc(profileRef(uid), data);
}

export const signOutCustomer = (): Promise<void> => signOut(customerAuth);

/**
 * Creates the Firebase account and its profile. If the profile can't be saved, the account is removed again,
 * so the customer can simply try again (rather than being left with an account that has no profile).
 */
export async function createAccount(email: string, password: string, phone: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(customerAuth, email, password);
  try {
    await createProfile(user.uid, { email, phone });
  } catch (e) {
    await user.delete().catch(() => signOut(customerAuth));
    throw e;
  }
}

export async function logIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(customerAuth, email, password);
}

/** Emails a password-reset link. */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(customerAuth, email);
  } catch (e) {
    // Don't reveal whether an account exists for this email.
    if (e && typeof e === "object" && "code" in e && e.code === "auth/user-not-found") return;
    throw e;
  }
}

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

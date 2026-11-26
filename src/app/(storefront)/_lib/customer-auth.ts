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
import { authEmail, MIN_PASSWORD_LENGTH, type Identifier } from "./account-identity";
import { toE164 } from "./phone";

/** customers/{uid}: the fields the Firestore rules let a customer create and see. */
export type CustomerProfile = {
  id: string;
  name: string;
  /** Set for accounts made with a username (they sign in with it); "" for accounts made with an email. */
  username?: string;
  email?: string;
  /** E.164, e.g. "+919876543210". Typed at sign-up, not verified. */
  phone: string;
  cart?: CartItem[];
  wishlist?: string[];
  createdAt: string;
  updatedAt: string;
  source: "website";
};

const WRONG_LOGIN = "That username/email or password isn't right.";
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": WRONG_LOGIN,
  "auth/invalid-login-credentials": WRONG_LOGIN,
  "auth/wrong-password": WRONG_LOGIN,
  "auth/user-not-found": WRONG_LOGIN,
  "auth/invalid-email": WRONG_LOGIN,
  "auth/email-already-in-use": "That username or email already has an account. Try logging in instead.",
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
const cleanEmail = (email?: string) => (email ?? "").trim().toLowerCase();

export async function getProfile(uid: string): Promise<CustomerProfile | null> {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? (snap.data() as CustomerProfile) : null;
}

/**
 * A new account's customers/{uid}: the username or email it signs in with (the rules check it matches the
 * sign-in) and the mobile number as typed (10 digits). The name is added later, at checkout or on My Account.
 */
export async function createProfile(uid: string, { id, phone }: { id: Identifier; phone: string }): Promise<void> {
  const now = new Date().toISOString();
  const profile: Required<CustomerProfile> = {
    id: uid,
    name: "",
    username: id.kind === "username" ? id.username : "",
    email: id.kind === "email" ? id.email : "",
    phone: toE164(phone),
    cart: [],
    wishlist: [],
    createdAt: now,
    updatedAt: now,
    source: "website",
  };
  await setDoc(profileRef(uid), profile);
}

/** My Account edits: name and email only (the username and mobile number can't change here). */
export async function updateProfile(uid: string, changes: { name?: string; email?: string }): Promise<void> {
  const data: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (changes.name !== undefined) data.name = changes.name.trim();
  if (changes.email !== undefined) data.email = cleanEmail(changes.email);
  await updateDoc(profileRef(uid), data);
}

export const signOutCustomer = (): Promise<void> => signOut(customerAuth);

/**
 * Creates the Firebase account and its profile. If the profile can't be saved, the account is removed again,
 * so the customer can simply try again (rather than being left with an account that has no profile).
 */
export async function createAccount(id: Identifier, password: string, phone: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(customerAuth, authEmail(id), password);
  try {
    await createProfile(user.uid, { id, phone });
  } catch (e) {
    await user.delete().catch(() => signOut(customerAuth));
    throw e;
  }
}

export async function logIn(id: Identifier, password: string): Promise<void> {
  await signInWithEmailAndPassword(customerAuth, authEmail(id), password);
}

/** Emails a password-reset link. Only email accounts can get one: a username account has no mailbox. */
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

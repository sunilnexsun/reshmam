"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { customerAuth, customerDb } from "./customer-firebase";
import { cartStore, wishlistStore, type CartItem } from "./store";

/**
 * Keeps a signed-in customer's cart and wishlist in their Firebase account (customers/{uid}.cart and
 * .wishlist), so they follow the customer to other devices. Guests keep both only in this browser, as before.
 *
 * - First sign-in on a device: what's in this browser is merged with what the account already has.
 * - After that the account is the source of truth: each page load, and each return to the tab, loads it,
 *   and every change here is saved to it shortly after.
 * - Signing out clears the cart and wishlist from this browser (they stay saved in the account).
 */

/** Remembers which account this browser's cart and wishlist were last merged with. */
export const SYNCED_USER_KEY = "reshmam-synced-user";
/** How long to wait after a change before saving, so quick edits are saved together. */
export const SAVE_DELAY_MS = 500;

type Lists = { cart: CartItem[]; wishlist: string[] };

/** Where a customer's lists are kept. The real one is Firestore; tests use an in-memory one. */
export type AccountStore = {
  /** Called with the customer's uid once they're signed in and have a profile, and with null on sign-out. */
  onUser(cb: (uid: string | null) => void): () => void;
  /** The account's lists, or null if the account has no profile. Throws if they couldn't be loaded. */
  load(uid: string): Promise<Lists | null>;
  save(uid: string, lists: Lists): Promise<void>;
};

/** Both lists' items; for a product in both, keeps the larger quantity (signing in twice never doubles it). */
export function mergeCarts(local: CartItem[], saved: CartItem[]): CartItem[] {
  const merged = new Map(saved.map((i) => [i.variantId, i.quantity]));
  for (const i of local) merged.set(i.variantId, Math.max(merged.get(i.variantId) ?? 0, i.quantity));
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function mergeWishlists(local: string[], saved: string[]): string[] {
  return [...new Set([...saved, ...local])];
}

/** customers/{uid} in Firestore. A new customer signs in a moment before their profile is written, so the
 * uid is only reported once the profile exists (saving updates the document, which must already be there). */
export function firestoreAccountStore(): AccountStore {
  const ref = (uid: string) => doc(customerDb, "customers", uid);
  return {
    onUser(cb) {
      let stopProfile: (() => void) | undefined;
      const stopAuth = onAuthStateChanged(customerAuth, (user) => {
        stopProfile?.();
        stopProfile = undefined;
        if (!user) return cb(null);
        let reported = false;
        stopProfile = onSnapshot(
          ref(user.uid),
          (snap) => {
            if (!snap.exists() || reported) return;
            reported = true;
            cb(user.uid);
          },
          () => {},
        );
      });
      return () => {
        stopProfile?.();
        stopAuth();
      };
    },
    async load(uid) {
      const snap = await getDoc(ref(uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        cart: Array.isArray(data.cart) ? (data.cart as CartItem[]) : [],
        wishlist: Array.isArray(data.wishlist) ? (data.wishlist as string[]) : [],
      };
    },
    async save(uid, { cart, wishlist }) {
      await updateDoc(ref(uid), { cart, wishlist, updatedAt: new Date().toISOString() });
    },
  };
}

function readMarker() {
  try {
    return localStorage.getItem(SYNCED_USER_KEY);
  } catch {
    return null;
  }
}
function writeMarker(userId: string | null) {
  try {
    if (userId) localStorage.setItem(SYNCED_USER_KEY, userId);
    else localStorage.removeItem(SYNCED_USER_KEY);
  } catch {
    /* storage unavailable – we'll merge again next time, which is harmless */
  }
}

/** Starts syncing; returns a function that stops it. */
export function startAccountSync(store: AccountStore = firestoreAccountStore()): () => void {
  let userId: string | null = null;
  let ready = false; // true once the account's saved lists have loaded; nothing is saved before that
  let applying = false; // true while we write the account's lists into this browser
  let saved = ""; // what the account holds, as last loaded or saved
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();

  /** Runs loads and saves one at a time, so a load never overwrites a save that's still in flight. */
  const run = (task: () => Promise<void>) => {
    queue = queue.then(task).catch((e) => console.warn("Couldn't sync your cart and wishlist", e));
    return queue;
  };

  const applyLocally = (cart: CartItem[], list: string[]) => {
    applying = true;
    try {
      cartStore.replace(cart);
      wishlistStore.replace(list);
    } finally {
      applying = false;
    }
  };

  const current = (): Lists => ({ cart: cartStore.get(), wishlist: wishlistStore.get() });

  async function load(merge: boolean) {
    const id = userId;
    if (!id) return;
    const account = await store.load(id);
    if (id !== userId || !account) return; // signed out meanwhile, or no profile to sync with
    saved = JSON.stringify(account);
    applyLocally(
      merge ? mergeCarts(cartStore.get(), account.cart) : account.cart,
      merge ? mergeWishlists(wishlistStore.get(), account.wishlist) : account.wishlist,
    );
    ready = true;
    writeMarker(id);
    if (merge) await save();
  }

  async function save() {
    const id = userId;
    if (!ready || !id) return;
    const lists = current();
    const json = JSON.stringify(lists);
    if (json === saved) return;
    await store.save(id, lists);
    saved = json;
  }

  const saveSoon = () => {
    if (applying || !ready) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void run(save);
    }, SAVE_DELAY_MS);
  };

  const saveNow = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    void run(save);
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") saveNow();
    // Back on the tab: pick up changes made on another device, unless a change here is still waiting to save.
    else if (ready && timer === undefined) void run(() => load(false));
  };

  const stopUser = store.onUser((id) => {
    if (id && id !== userId) {
      userId = id;
      ready = false;
      void run(() => load(readMarker() !== id));
    } else if (!id && userId) {
      clearTimeout(timer);
      timer = undefined;
      userId = null;
      ready = false;
      writeMarker(null);
      applyLocally([], []);
    }
  });

  const stopCart = cartStore.subscribe(saveSoon);
  const stopWishlist = wishlistStore.subscribe(saveSoon);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    saveNow();
    stopUser();
    stopCart();
    stopWishlist();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

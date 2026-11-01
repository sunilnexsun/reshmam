"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { products } from "./products";
import { cartStore, wishlistStore, type CartItem } from "./store";
import { getSupabaseBrowser } from "./supabase-browser";

/**
 * Keeps a signed-in customer's cart and wishlist in Supabase (the `carts` and `wishlists` tables), so they
 * follow the customer to other devices. Guests keep both only in this browser, as before.
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

const knownProducts = new Set(products.map((p) => p.slug));

/** Both lists' items; for a product in both, keeps the larger quantity (signing in twice never doubles it). */
export function mergeCarts(local: CartItem[], saved: CartItem[]): CartItem[] {
  const merged = new Map(saved.map((i) => [i.variantId, i.quantity]));
  for (const i of local) merged.set(i.variantId, Math.max(merged.get(i.variantId) ?? 0, i.quantity));
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function mergeWishlists(local: string[], saved: string[]): string[] {
  return [...new Set([...saved, ...local])];
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

/** Starts syncing; returns a function that stops it. Does nothing when Supabase isn't configured. */
export function startAccountSync(db: SupabaseClient | null = getSupabaseBrowser()): () => void {
  if (!db) return () => {};

  let userId: string | null = null;
  let ready = false; // true once the account's saved lists have loaded; nothing is saved before that
  let applying = false; // true while we write the account's lists into this browser
  let savedCart = "[]"; // what the account holds, as last loaded or saved
  let savedWishlist = new Set<string>();
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

  async function load(merge: boolean) {
    const id = userId;
    if (!id) return;
    const [cartRes, listRes] = await Promise.all([
      db!.from("carts").select("items").eq("auth_user_id", id).maybeSingle(),
      db!.from("wishlists").select("product_slug").eq("auth_user_id", id).order("created_at"),
    ]);
    if (cartRes.error || listRes.error) throw cartRes.error ?? listRes.error;
    if (id !== userId) return; // signed out meanwhile

    const accountCart = (cartRes.data?.items as CartItem[] | undefined) ?? [];
    const accountList = (listRes.data ?? []).map((r: { product_slug: string }) => r.product_slug);
    savedCart = JSON.stringify(accountCart);
    savedWishlist = new Set(accountList);

    applyLocally(
      merge ? mergeCarts(cartStore.get(), accountCart) : accountCart,
      merge ? mergeWishlists(wishlistStore.get(), accountList) : accountList,
    );
    ready = true;
    writeMarker(id);
    if (merge) await save();
  }

  async function save() {
    const id = userId;
    if (!ready || !id) return;
    const cart = cartStore.get();
    if (JSON.stringify(cart) !== savedCart) {
      const { error } = await db!
        .from("carts")
        .upsert({ auth_user_id: id, items: cart, updated_at: new Date().toISOString() });
      if (error) throw error;
      savedCart = JSON.stringify(cart);
    }
    const list = wishlistStore.get().filter((slug) => knownProducts.has(slug));
    const added = list.filter((slug) => !savedWishlist.has(slug));
    const removed = [...savedWishlist].filter((slug) => !list.includes(slug));
    if (added.length) {
      const { error } = await db!
        .from("wishlists")
        .upsert(added.map((product_slug) => ({ auth_user_id: id, product_slug })), { ignoreDuplicates: true });
      if (error) throw error;
    }
    if (removed.length) {
      const { error } = await db!.from("wishlists").delete().eq("auth_user_id", id).in("product_slug", removed);
      if (error) throw error;
    }
    savedWishlist = new Set(list);
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

  const { data: auth } = db.auth.onAuthStateChange((event, session) => {
    const id = session?.user.id ?? null;
    // Supabase asks that its calls aren't made inside this callback, so the work runs just after it.
    setTimeout(() => {
      if (id && id !== userId) {
        userId = id;
        ready = false;
        void run(() => load(readMarker() !== id));
      } else if (!id && event === "SIGNED_OUT" && userId) {
        clearTimeout(timer);
        timer = undefined;
        userId = null;
        ready = false;
        writeMarker(null);
        applyLocally([], []);
      }
    }, 0);
  });

  const stopCart = cartStore.subscribe(saveSoon);
  const stopWishlist = wishlistStore.subscribe(saveSoon);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    saveNow();
    auth.subscription.unsubscribe();
    stopCart();
    stopWishlist();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

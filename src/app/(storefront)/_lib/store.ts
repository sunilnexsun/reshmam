"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny persisted store (localStorage) used for the cart and wishlist.
 * Only variant IDs and quantities are stored — never prices. Prices are
 * always looked up from the catalogue (and recalculated on the server at checkout).
 */
function createPersistedStore<T>(key: string, fallback: T, validate: (v: unknown) => T) {
  let state: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = validate(JSON.parse(raw));
    } catch {
      state = fallback;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  function set(updater: (prev: T) => T) {
    load();
    state = updater(state);
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode) – keep in memory */
    }
    emit();
  }

  return {
    get: () => {
      load();
      return state;
    },
    set,
    /** Replaces the whole value, cleaned by the same checks as data read from storage. */
    replace(value: unknown) {
      set(() => validate(value));
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          loaded = false;
          load();
          emit();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    serverSnapshot: () => fallback,
  };
}

export type CartItem = { variantId: string; quantity: number };

const EMPTY_CART: CartItem[] = [];
const EMPTY_LIST: string[] = [];

export const cartStore = createPersistedStore<CartItem[]>("reshmam-cart-v1", EMPTY_CART, (v) =>
  Array.isArray(v)
    ? v
        .filter((i) => i && typeof i.variantId === "string" && Number.isInteger(i.quantity) && i.quantity > 0)
        .map((i) => ({ variantId: i.variantId, quantity: Math.min(50, i.quantity) }))
    : EMPTY_CART,
);

export const wishlistStore = createPersistedStore<string[]>("reshmam-wishlist-v1", EMPTY_LIST, (v) =>
  Array.isArray(v) ? v.filter((s) => typeof s === "string") : EMPTY_LIST,
);

export function useCartItems() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.serverSnapshot);
}

export function useWishlist() {
  return useSyncExternalStore(wishlistStore.subscribe, wishlistStore.get, wishlistStore.serverSnapshot);
}

export const cart = {
  add(variantId: string, quantity = 1) {
    cartStore.set((items) => {
      const existing = items.find((i) => i.variantId === variantId);
      if (existing) {
        return items.map((i) =>
          i.variantId === variantId ? { ...i, quantity: Math.min(50, i.quantity + quantity) } : i,
        );
      }
      return [...items, { variantId, quantity }];
    });
  },
  setQuantity(variantId: string, quantity: number) {
    cartStore.set((items) =>
      quantity <= 0
        ? items.filter((i) => i.variantId !== variantId)
        : items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(50, quantity) } : i)),
    );
  },
  remove(variantId: string) {
    cartStore.set((items) => items.filter((i) => i.variantId !== variantId));
  },
  clear() {
    cartStore.set(() => []);
  },
};

export const wishlist = {
  toggle(slug: string) {
    wishlistStore.set((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]));
  },
};

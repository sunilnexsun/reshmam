// Cart and wishlist sync for signed-in customers, against an in-memory stand-in for their Firebase account.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@storefront/_lib/store";

type Lists = { cart: CartItem[]; wishlist: string[] };

/** An in-memory AccountStore: accounts by uid, plus sign-in / sign-out and a switch to make loads fail. */
function fakeAccountStore() {
  const accounts = new Map<string, Lists>();
  let listener: ((uid: string | null) => void) | undefined;
  let failLoads = false;
  const saves: { uid: string; lists: Lists }[] = [];
  return {
    accounts,
    saves,
    setFailLoads: (v: boolean) => (failLoads = v),
    signIn: (uid = "user-1") => listener?.(uid),
    signOut: () => listener?.(null),
    store: {
      onUser(cb: (uid: string | null) => void) {
        listener = cb;
        return () => (listener = undefined);
      },
      async load(uid: string) {
        if (failLoads) throw new Error("offline");
        const a = accounts.get(uid);
        return a ? structuredClone(a) : null;
      },
      async save(uid: string, lists: Lists) {
        saves.push({ uid, lists: structuredClone(lists) });
        accounts.set(uid, structuredClone(lists));
      },
    },
  };
}

// The stores and the sync use `window` and `document`, which Node doesn't have.
const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
beforeAll(() => {
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage }));
  vi.stubGlobal("document", doc);
});

// The default Firestore adapter isn't used here; keep the Firebase SDK out of the test.
vi.mock("@storefront/_lib/customer-firebase", () => ({ customerAuth: {}, customerDb: {} }));

const { cartStore, wishlistStore } = await import("@storefront/_lib/store");
const { SAVE_DELAY_MS, SYNCED_USER_KEY, mergeCarts, mergeWishlists, startAccountSync } = await import("@storefront/_lib/account-sync");

/** Lets the loads and the saves finish. */
const settle = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms + 1);
  await vi.advanceTimersByTimeAsync(1);
};

let fake: ReturnType<typeof fakeAccountStore>;
let stop: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  cartStore.replace([]);
  wishlistStore.replace([]);
  fake = fakeAccountStore();
  stop = startAccountSync(fake.store);
});
afterEach(() => {
  stop();
  vi.useRealTimers();
});

describe("merging", () => {
  it("keeps every item, and the larger quantity for an item in both", () => {
    expect(mergeCarts([{ variantId: "A", quantity: 2 }, { variantId: "B", quantity: 1 }], [{ variantId: "A", quantity: 3 }, { variantId: "C", quantity: 1 }]))
      .toEqual([{ variantId: "A", quantity: 3 }, { variantId: "C", quantity: 1 }, { variantId: "B", quantity: 1 }]);
    expect(mergeWishlists(["x", "y"], ["y", "z"])).toEqual(["y", "z", "x"]);
  });
});

describe("account sync", () => {
  it("merges this browser's cart and wishlist with the account on first sign-in, and saves the result", async () => {
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }]);
    wishlistStore.replace(["gingelly-oil"]);
    fake.accounts.set("user-1", { cart: [{ variantId: "GIN-1L", quantity: 2 }, { variantId: "COC-1L", quantity: 1 }], wishlist: ["coconut-oil"] });

    fake.signIn();
    await settle();

    expect(cartStore.get()).toEqual([{ variantId: "GIN-1L", quantity: 2 }, { variantId: "COC-1L", quantity: 1 }]);
    expect(wishlistStore.get()).toEqual(["coconut-oil", "gingelly-oil"]);
    expect(fake.accounts.get("user-1")).toEqual({ cart: cartStore.get(), wishlist: ["coconut-oil", "gingelly-oil"] });
    expect(localStorage.getItem(SYNCED_USER_KEY)).toBe("user-1");
  });

  it("on later visits takes the account's lists, so an item removed on another device stays removed", async () => {
    localStorage.setItem(SYNCED_USER_KEY, "user-1");
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }, { variantId: "COC-1L", quantity: 1 }]);
    fake.accounts.set("user-1", { cart: [{ variantId: "COC-1L", quantity: 1 }], wishlist: [] });

    fake.signIn();
    await settle();

    expect(cartStore.get()).toEqual([{ variantId: "COC-1L", quantity: 1 }]);
    expect(fake.saves).toEqual([]); // nothing changed, nothing written
  });

  it("saves changes shortly after they're made, including wishlist removals, and keeps any product slug", async () => {
    fake.accounts.set("user-1", { cart: [], wishlist: ["coconut-oil"] });
    localStorage.setItem(SYNCED_USER_KEY, "user-1");
    fake.signIn();
    await settle();

    cartStore.replace([{ variantId: "GIN-1L", quantity: 4 }]);
    wishlistStore.replace(["gingelly-oil", "new-firestore-product"]);
    await settle(0);
    expect(fake.saves).toEqual([]); // not saved yet: waits so quick edits go together
    await settle(SAVE_DELAY_MS);

    expect(fake.saves).toHaveLength(1);
    expect(fake.accounts.get("user-1")).toEqual({ cart: [{ variantId: "GIN-1L", quantity: 4 }], wishlist: ["gingelly-oil", "new-firestore-product"] });
  });

  it("saves straight away when the tab is hidden", async () => {
    fake.accounts.set("user-1", { cart: [], wishlist: [] });
    fake.signIn();
    await settle();
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }]);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle();
    doc.visibilityState = "visible";
    expect(fake.accounts.get("user-1")!.cart).toEqual([{ variantId: "GIN-1L", quantity: 1 }]);
  });

  it("reloads the account's lists when the customer comes back to the tab", async () => {
    fake.accounts.set("user-1", { cart: [], wishlist: [] });
    fake.signIn();
    await settle();
    fake.accounts.set("user-1", { cart: [{ variantId: "COC-1L", quantity: 2 }], wishlist: [] });
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(cartStore.get()).toEqual([{ variantId: "COC-1L", quantity: 2 }]);
  });

  it("clears the cart and wishlist from this browser on sign-out, leaving the account's copy", async () => {
    fake.accounts.set("user-1", { cart: [], wishlist: [] });
    fake.signIn();
    await settle();
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }]);
    await settle(SAVE_DELAY_MS);

    fake.signOut();
    await settle();

    expect(cartStore.get()).toEqual([]);
    expect(localStorage.getItem(SYNCED_USER_KEY)).toBeNull();
    expect(fake.accounts.get("user-1")!.cart).toEqual([{ variantId: "GIN-1L", quantity: 1 }]);
  });

  it("never overwrites the account when its lists couldn't be loaded", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.accounts.set("user-1", { cart: [{ variantId: "COC-1L", quantity: 1 }], wishlist: [] });
    fake.setFailLoads(true);
    fake.signIn();
    await settle();

    cartStore.replace([{ variantId: "GIN-1L", quantity: 9 }]);
    await settle(SAVE_DELAY_MS);

    expect(fake.saves).toEqual([]);
    expect(localStorage.getItem(SYNCED_USER_KEY)).toBeNull();
  });

  it("never writes to an account that has no profile yet", async () => {
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }]);
    fake.signIn("no-profile");
    await settle();
    cartStore.replace([{ variantId: "GIN-1L", quantity: 2 }]);
    await settle(SAVE_DELAY_MS);
    expect(fake.saves).toEqual([]);
    expect(cartStore.get()).toEqual([{ variantId: "GIN-1L", quantity: 2 }]);
  });
});

// Cart and wishlist sync for signed-in customers, against a tiny in-memory stand-in for Supabase.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;

/** In-memory `carts` and `wishlists` with just the query-builder calls the sync uses. */
function fakeSupabase() {
  const tables: Record<string, Row[]> = { carts: [], wishlists: [] };
  let listener: AuthCallback | undefined;
  let failReads = false;

  function from(table: string) {
    const conds: [string, (v: unknown) => boolean][] = [];
    let op: "select" | "delete" = "select";
    const rows = () => tables[table].filter((r) => conds.every(([k, test]) => test(r[k])));
    const run = () => {
      if (op === "select" && failReads) return { data: null, error: { message: "offline" } };
      if (op === "delete") {
        const gone = new Set(rows());
        tables[table] = tables[table].filter((r) => !gone.has(r));
        return { data: null, error: null };
      }
      return { data: rows(), error: null };
    };
    const b = {
      select: () => b,
      order: () => b,
      eq: (k: string, v: unknown) => (conds.push([k, (x) => x === v]), b),
      in: (k: string, vs: unknown[]) => (conds.push([k, (x) => vs.includes(x)]), b),
      delete: () => ((op = "delete"), b),
      maybeSingle: async () => {
        const r = run();
        return { data: (r.data as Row[] | null)?.[0] ?? null, error: r.error };
      },
      upsert: async (value: Row | Row[]) => {
        for (const row of Array.isArray(value) ? value : [value]) {
          const key = table === "carts" ? ["auth_user_id"] : ["auth_user_id", "product_slug"];
          const i = tables[table].findIndex((r) => key.every((k) => r[k] === row[k]));
          if (i < 0) tables[table].push({ ...row });
          else if (table === "carts") tables[table][i] = { ...row };
        }
        return { data: null, error: null };
      },
      then: (resolve: (r: unknown) => unknown) => resolve(run()),
    };
    return b;
  }

  const client = {
    from,
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        listener = cb;
        return { data: { subscription: { unsubscribe: () => (listener = undefined) } } };
      },
    },
  } as unknown as SupabaseClient;

  return {
    client,
    tables,
    setFailReads: (v: boolean) => (failReads = v),
    signIn: (id = "user-1") => listener?.("SIGNED_IN", { user: { id } }),
    signOut: () => listener?.("SIGNED_OUT", null),
  };
}

// The stores and the sync use `window` and `document`, which Node doesn't have.
const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
beforeAll(() => {
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage }));
  vi.stubGlobal("document", doc);
});

const { cartStore, wishlistStore } = await import("@storefront/_lib/store");
const { SAVE_DELAY_MS, SYNCED_USER_KEY, mergeCarts, mergeWishlists, startAccountSync } = await import("@storefront/_lib/account-sync");

/** Lets the deferred auth handling, the loads and the saves finish. */
const settle = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms + 1);
  await vi.advanceTimersByTimeAsync(1);
};

let fake: ReturnType<typeof fakeSupabase>;
let stop: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  cartStore.replace([]);
  wishlistStore.replace([]);
  fake = fakeSupabase();
  stop = startAccountSync(fake.client);
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
    fake.tables.carts.push({ auth_user_id: "user-1", items: [{ variantId: "GIN-1L", quantity: 2 }, { variantId: "COC-1L", quantity: 1 }] });
    fake.tables.wishlists.push({ auth_user_id: "user-1", product_slug: "coconut-oil" });

    fake.signIn();
    await settle();

    expect(cartStore.get()).toEqual([{ variantId: "GIN-1L", quantity: 2 }, { variantId: "COC-1L", quantity: 1 }]);
    expect(wishlistStore.get()).toEqual(["coconut-oil", "gingelly-oil"]);
    expect(fake.tables.carts[0].items).toEqual(cartStore.get());
    expect(fake.tables.wishlists.map((r) => r.product_slug).sort()).toEqual(["coconut-oil", "gingelly-oil"]);
    expect(localStorage.getItem(SYNCED_USER_KEY)).toBe("user-1");
  });

  it("on later visits takes the account's lists, so an item removed on another device stays removed", async () => {
    localStorage.setItem(SYNCED_USER_KEY, "user-1");
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }, { variantId: "COC-1L", quantity: 1 }]);
    fake.tables.carts.push({ auth_user_id: "user-1", items: [{ variantId: "COC-1L", quantity: 1 }] });

    fake.signIn();
    await settle();

    expect(cartStore.get()).toEqual([{ variantId: "COC-1L", quantity: 1 }]);
    expect(fake.tables.carts[0].items).toEqual([{ variantId: "COC-1L", quantity: 1 }]);
  });

  it("saves changes shortly after they're made, including wishlist removals", async () => {
    fake.tables.wishlists.push({ auth_user_id: "user-1", product_slug: "coconut-oil" });
    fake.signIn();
    await settle();

    cartStore.replace([{ variantId: "GIN-1L", quantity: 4 }]);
    wishlistStore.replace(["gingelly-oil", "not-a-real-product"]);
    await settle(0);
    expect(fake.tables.carts).toEqual([]); // not saved yet: waits so quick edits go together
    await settle(SAVE_DELAY_MS);

    expect(fake.tables.carts[0]).toMatchObject({ auth_user_id: "user-1", items: [{ variantId: "GIN-1L", quantity: 4 }] });
    // Unknown products aren't sent (the database would reject them); the removed one is deleted.
    expect(fake.tables.wishlists).toEqual([{ auth_user_id: "user-1", product_slug: "gingelly-oil" }]);
  });

  it("saves straight away when the tab is hidden", async () => {
    fake.signIn();
    await settle();
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }]);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle();
    doc.visibilityState = "visible";
    expect(fake.tables.carts[0].items).toEqual([{ variantId: "GIN-1L", quantity: 1 }]);
  });

  it("reloads the account's lists when the customer comes back to the tab", async () => {
    fake.signIn();
    await settle();
    fake.tables.carts.push({ auth_user_id: "user-1", items: [{ variantId: "COC-1L", quantity: 2 }] });
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(cartStore.get()).toEqual([{ variantId: "COC-1L", quantity: 2 }]);
  });

  it("clears the cart and wishlist from this browser on sign-out, leaving the account's copy", async () => {
    fake.signIn();
    await settle();
    cartStore.replace([{ variantId: "GIN-1L", quantity: 1 }]);
    await settle(SAVE_DELAY_MS);

    fake.signOut();
    await settle();

    expect(cartStore.get()).toEqual([]);
    expect(localStorage.getItem(SYNCED_USER_KEY)).toBeNull();
    expect(fake.tables.carts[0].items).toEqual([{ variantId: "GIN-1L", quantity: 1 }]);
  });

  it("never overwrites the account when its lists couldn't be loaded", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.tables.carts.push({ auth_user_id: "user-1", items: [{ variantId: "COC-1L", quantity: 1 }] });
    fake.setFailReads(true);
    fake.signIn();
    await settle();

    cartStore.replace([{ variantId: "GIN-1L", quantity: 9 }]);
    await settle(SAVE_DELAY_MS);

    expect(fake.tables.carts[0].items).toEqual([{ variantId: "COC-1L", quantity: 1 }]);
    expect(localStorage.getItem(SYNCED_USER_KEY)).toBeNull();
  });

  it("does nothing when customer accounts aren't configured", () => {
    expect(() => startAccountSync(null)()).not.toThrow();
  });
});

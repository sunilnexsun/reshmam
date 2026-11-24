// Applies every migration in supabase/migrations plus supabase/seed.sql to an in-memory Postgres (PGlite)
// and checks the order functions the checkout relies on.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { TEST_CATALOGUE_SQL } from "./test-catalogue";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const migrationsDir = join(root, "supabase/migrations");

let db: PGlite;
let variant: { id: string; price_inr: number };
let n = 0;

const one = async <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  (await db.query<T>(sql, params)).rows[0];
const count = async (table: string) => Number((await one<{ count: string }>(`select count(*) from ${table}`)).count);
const stock = async () => (await one<{ stock: number }>("select stock from product_variants where id = $1", [variant.id])).stock;
const setStock = (s: number) => db.query("update product_variants set stock = $2 where id = $1", [variant.id, s]);
const order = (id: string) =>
  one<{ status: string; payment_status: string; stock_committed: boolean; stock_shortfall: boolean }>(
    "select status, payment_status, stock_committed, stock_shortfall from orders where id = $1",
    [id],
  );

/** Calls place_order with `qtys` as separate lines of the test variant. */
const place = async (method: "cod" | "online", ...qtys: number[]) => {
  n++;
  const total = variant.price_inr * qtys.reduce((a, b) => a + b, 0);
  const row = await one<{ id: string }>("select public.place_order($1, $2, $3, $4) as id", [
    { name: "Test Buyer", email: "Buyer@Example.com", phone: "9000000000" },
    { line1: "1 Main Road", line2: null, city: "Kovilpatti", state: "Tamil Nadu", pincode: "628502" },
    { order_number: `RSH-TEST-${n}`, access_token: `token-${n}`, payment_method: method, subtotal_inr: total, shipping_inr: 0, total_inr: total },
    JSON.stringify(qtys.map((q) => ({
      variant_id: variant.id, product_name: "Test", variant_label: "1 L",
      unit_price_inr: variant.price_inr, quantity: q, line_total_inr: variant.price_inr * q,
    }))),
  ]);
  return row.id;
};
const markPaid = async (id: string) =>
  (await one<{ r: boolean }>("select public.mark_order_paid($1, $2) as r", [id, `pay_${id}`])).r;

beforeAll(async () => {
  db = new PGlite();
  // Stand-ins for what Supabase provides.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select null::uuid';
  `);
  for (const f of readdirSync(migrationsDir).sort()) {
    // PGlite has no pgcrypto; gen_random_uuid() is built into Postgres 13+ anyway.
    await db.exec(readFileSync(join(migrationsDir, f), "utf8").replace("create extension if not exists pgcrypto;", ""));
  }
  await db.exec(readFileSync(join(root, "supabase/seed.sql"), "utf8"));
  await db.exec(TEST_CATALOGUE_SQL);
  variant = (await one<{ id: string; price_inr: number }>("select id, price_inr from product_variants order by id limit 1"))!;
});

beforeEach(() => setStock(5));

describe("place_order", () => {
  it("saves a cash-on-delivery order and takes its stock in the same transaction", async () => {
    const id = await place("cod", 2);
    expect(await order(id)).toMatchObject({ status: "placed", payment_status: "cod_pending", stock_committed: true });
    expect(await stock()).toBe(3);
    expect((await one<{ change: number }>("select change from inventory_movements where order_id = $1", [id])).change).toBe(-2);
  });

  it("stores the customer email in lower case", async () => {
    await place("online", 1); // sent as Buyer@Example.com
    expect(await count("customers")).toBeGreaterThan(0);
    expect(Number((await one<{ count: string }>("select count(*) from customers where email <> lower(email)")).count)).toBe(0);
  });

  it("refuses duplicate lines that oversell, and leaves nothing behind", async () => {
    const before = [await count("customers"), await count("orders"), await count("order_items")];
    await expect(place("cod", 3, 3)).rejects.toThrow(/insufficient_stock/);
    expect([await count("customers"), await count("orders"), await count("order_items")]).toEqual(before);
    expect(await stock()).toBe(5);
  });

  it("leaves stock alone for an online order until it is paid", async () => {
    const id = await place("online", 1);
    expect(await order(id)).toMatchObject({ status: "pending_payment", payment_status: "pending", stock_committed: false });
    expect(await stock()).toBe(5);
  });
});

describe("mark_order_paid", () => {
  it("marks the order paid and takes its stock exactly once", async () => {
    const id = await place("online", 2);
    expect(await markPaid(id)).toBe(true);
    expect(await order(id)).toMatchObject({ status: "paid", payment_status: "paid", stock_committed: true });
    expect(await stock()).toBe(3);
    // The browser's verify call and Razorpay's webhook can both arrive.
    expect(await markPaid(id)).toBe(false);
    expect(await stock()).toBe(3);
  });

  it("keeps the payment and flags the order when stock ran out before it was paid", async () => {
    const id = await place("online", 2);
    await setStock(1);
    expect(await markPaid(id)).toBe(true);
    expect(await order(id)).toMatchObject({ payment_status: "paid", stock_shortfall: true, stock_committed: false });
    expect(await stock()).toBe(1);
  });
});

describe("payment handling", () => {
  const issues = async (id: string) =>
    (await db.query<{ kind: string }>("select kind from payment_issues where order_id = $1 order by id", [id])).rows.map((r) => r.kind);
  const paidWith = (id: string, paymentId: string) =>
    one<{ r: boolean }>("select public.mark_order_paid($1, $2) as r", [id, paymentId]).then((x) => x.r);
  const failed = (id: string) => one<{ r: boolean }>("select public.mark_order_failed($1) as r", [id]).then((x) => x.r);

  it("does not revive a refunded order, and records the late payment", async () => {
    const id = await place("online", 1);
    expect(await markPaid(id)).toBe(true);
    await db.query("update orders set payment_status = 'refunded', status = 'cancelled' where id = $1", [id]);
    expect(await paidWith(id, "pay_late")).toBe(false);
    expect(await order(id)).toMatchObject({ status: "cancelled", payment_status: "refunded" });
    expect(await issues(id)).toEqual(["late_payment"]);
  });

  it("does not revive a cancelled unpaid order", async () => {
    const id = await place("online", 1);
    await db.query("update orders set status = 'cancelled' where id = $1", [id]);
    expect(await paidWith(id, "pay_after_cancel")).toBe(false);
    expect((await order(id)).status).toBe("cancelled");
    expect(await stock()).toBe(5);
    expect(await issues(id)).toEqual(["late_payment"]);
  });

  it("records a second, different payment on a paid order as a duplicate (once)", async () => {
    const id = await place("online", 1);
    expect(await paidWith(id, "pay_first")).toBe(true);
    expect(await paidWith(id, "pay_first")).toBe(false); // the same payment again is not an issue
    expect(await paidWith(id, "pay_second")).toBe(false);
    expect(await paidWith(id, "pay_second")).toBe(false); // webhook retry
    expect(await issues(id)).toEqual(["duplicate_payment"]);
    expect(await stock()).toBe(4);
  });

  it("marks a failed payment, and a later successful attempt still marks the order paid", async () => {
    const id = await place("online", 2);
    expect(await failed(id)).toBe(true);
    expect(await order(id)).toMatchObject({ status: "payment_failed", payment_status: "failed" });
    expect(await failed(id)).toBe(false);
    expect(await paidWith(id, "pay_retry")).toBe(true);
    expect(await order(id)).toMatchObject({ status: "paid", payment_status: "paid", stock_committed: true });
    expect(await stock()).toBe(3);
  });

  it("never marks a paid or cash-on-delivery order as failed", async () => {
    const paid = await place("online", 1);
    await markPaid(paid);
    expect(await failed(paid)).toBe(false);
    const cod = await place("cod", 1);
    expect(await failed(cod)).toBe(false);
    expect((await order(cod)).status).toBe("placed");
  });
});

describe("commit_order_stock", () => {
  it("raises instead of clamping stock at zero", async () => {
    const id = await place("online", 1);
    await setStock(0);
    await expect(db.query("select public.commit_order_stock($1)", [id])).rejects.toThrow(/insufficient_stock/);
    expect((await order(id)).stock_committed).toBe(false);
    expect(await stock()).toBe(0);
  });
});

describe("permissions", () => {
  it.each([
    ["place_order", "place_order('{}', '{}', '{}', '[]')"],
    ["mark_order_paid", "mark_order_paid(gen_random_uuid(), 'x')"],
    ["commit_order_stock", "commit_order_stock(gen_random_uuid())"],
    ["mark_order_failed", "mark_order_failed(gen_random_uuid())"],
  ])("anon cannot execute %s", async (_name, call) => {
    try {
      await expect(db.exec(`set role anon; select public.${call};`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
});

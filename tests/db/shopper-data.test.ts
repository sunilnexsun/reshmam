// The saved cart and wishlist are written straight from the browser with the customer's session, so the
// database's row-level security is what keeps each customer to their own rows. This applies the real
// migrations to an in-memory Postgres (PGlite) and checks those rules as a signed-in customer would hit them.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { TEST_CATALOGUE_SQL } from "./test-catalogue";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const migrationsDir = join(root, "supabase/migrations");
const ME = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";

let db: PGlite;

/** Runs `sql` as a signed-in customer: Supabase's `authenticated` role, with auth.uid() returning `user`. */
async function asCustomer<T>(user: string, sql: string, params?: unknown[]) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Stand-ins for what Supabase provides, including its default table access for signed-in users.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `);
  for (const f of readdirSync(migrationsDir).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), "utf8").replace("create extension if not exists pgcrypto;", ""));
  }
  await db.exec(readFileSync(join(root, "supabase/seed.sql"), "utf8"));
  await db.exec(TEST_CATALOGUE_SQL);
  await db.exec(`
    grant select, insert, update, delete on public.carts, public.wishlists to authenticated;
    insert into auth.users values ('${ME}'), ('${OTHER}');
    insert into public.carts (auth_user_id, items) values ('${OTHER}', '[{"variantId":"X","quantity":1}]');
    insert into public.wishlists (auth_user_id, product_slug) values ('${OTHER}', 'coconut-oil');
  `);
});

describe("saved cart and wishlist (row-level security)", () => {
  it("lets a customer save, update and read back their own cart", async () => {
    const upsert = `insert into public.carts (auth_user_id, items) values ($1, $2)
                    on conflict (auth_user_id) do update set items = excluded.items`;
    await asCustomer(ME, upsert, [ME, JSON.stringify([{ variantId: "GIN-1L", quantity: 1 }])]);
    await asCustomer(ME, upsert, [ME, JSON.stringify([{ variantId: "GIN-1L", quantity: 3 }])]);
    const rows = await asCustomer<{ auth_user_id: string; items: unknown }>(ME, "select auth_user_id, items from public.carts");
    expect(rows).toEqual([{ auth_user_id: ME, items: [{ variantId: "GIN-1L", quantity: 3 }] }]);
  });

  it("lets a customer add and remove their own wishlist items", async () => {
    await asCustomer(ME, "insert into public.wishlists (auth_user_id, product_slug) values ($1, 'gingelly-oil'), ($1, 'coconut-oil')", [ME]);
    await asCustomer(ME, "delete from public.wishlists where auth_user_id = $1 and product_slug = 'coconut-oil'", [ME]);
    const rows = await asCustomer<{ product_slug: string }>(ME, "select product_slug from public.wishlists");
    expect(rows).toEqual([{ product_slug: "gingelly-oil" }]);
  });

  it("hides other customers' carts and wishlists, and refuses writes to them", async () => {
    expect(await asCustomer(ME, "select 1 from public.carts where auth_user_id = $1", [OTHER])).toEqual([]);
    expect(await asCustomer(ME, "select 1 from public.wishlists where auth_user_id = $1", [OTHER])).toEqual([]);
    await expect(asCustomer(ME, "insert into public.carts (auth_user_id, items) values ($1, '[]')", [OTHER])).rejects.toThrow(/row-level security/);
    await expect(asCustomer(ME, "insert into public.wishlists (auth_user_id, product_slug) values ($1, 'gingelly-oil')", [OTHER])).rejects.toThrow(/row-level security/);
    await asCustomer(ME, "delete from public.wishlists where auth_user_id = $1", [OTHER]);
    await asCustomer(ME, "update public.carts set items = '[]' where auth_user_id = $1", [OTHER]);
    const other = await db.query<{ items: unknown }>("select items from public.carts where auth_user_id = $1", [OTHER]);
    expect(other.rows[0].items).toEqual([{ variantId: "X", quantity: 1 }]);
    expect((await db.query("select 1 from public.wishlists where auth_user_id = $1", [OTHER])).rows).toHaveLength(1);
  });

  it("refuses wishlist items for products that don't exist", async () => {
    await expect(asCustomer(ME, "insert into public.wishlists (auth_user_id, product_slug) values ($1, 'no-such-oil')", [ME])).rejects.toThrow(/foreign key/);
  });
});

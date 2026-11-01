import "server-only";
import { cacheLife } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveVariants } from "@storefront/_lib/live";
import { getSupabaseAdmin } from "./integrations";

/** Live stock and prices straight from the database (uncached) — for checkout. */
export async function fetchLiveVariants(db: SupabaseClient, ids?: string[]): Promise<LiveVariants> {
  let query = db.from("product_variants").select("id, stock, price_inr, active");
  if (ids) query = query.in("id", ids);
  const { data, error } = await query;
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.id, { stock: r.stock, price: r.price_inr, active: r.active }]));
}

/**
 * Live stock and prices for display, cached for a few minutes so pages stay static. Null when the database
 * isn't configured or can't be reached, in which case the catalogue's values are shown.
 */
export async function getLiveVariants(): Promise<LiveVariants | null> {
  "use cache";
  cacheLife("minutes");
  const db = getSupabaseAdmin();
  if (!db) return null;
  try {
    return await fetchLiveVariants(db);
  } catch (err) {
    console.error("Could not load live stock", err);
    return null;
  }
}

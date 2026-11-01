import type { Product, Variant } from "./products";

/**
 * Live stock and prices per variant id, from the database when it is configured. The catalogue in
 * products.ts holds the starting values; once Supabase is connected the database is the source of truth.
 */
export type LiveVariants = Record<string, { stock: number; price: number; active: boolean }>;

/** The variant with its live stock and price (an inactive variant counts as out of stock). */
export function applyLive<V extends Variant>(variant: V, live: LiveVariants | null | undefined): V {
  const row = live?.[variant.id];
  if (!row) return variant;
  return { ...variant, price: row.price, stock: row.active ? row.stock : 0 };
}

export function applyLiveToProduct(product: Product, live: LiveVariants | null | undefined): Product {
  return live ? { ...product, variants: product.variants.map((v) => applyLive(v, live)) } : product;
}

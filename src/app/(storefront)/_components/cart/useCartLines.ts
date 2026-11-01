"use client";

import { applyLive } from "@storefront/_lib/live";
import { useLiveVariants } from "@storefront/_lib/live-catalogue";
import { findVariant } from "@storefront/_lib/products";
import { useCartItems } from "@storefront/_lib/store";

/** Joins persisted cart items with catalogue data and live stock/prices (display only — the server re-prices at checkout). */
export function useCartLines() {
  const items = useCartItems();
  const live = useLiveVariants();
  const lines = items
    .map((i) => {
      const found = findVariant(i.variantId);
      if (!found) return null;
      const variant = applyLive(found.variant, live);
      return { ...i, product: found.product, variant, lineTotal: variant.price * i.quantity };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { lines, subtotal, count };
}

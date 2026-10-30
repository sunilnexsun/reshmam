"use client";

import { findVariant } from "@/lib/products";
import { useCartItems } from "@/lib/store";

/** Joins persisted cart items with catalogue data (display only — server re-prices at checkout). */
export function useCartLines() {
  const items = useCartItems();
  const lines = items
    .map((i) => {
      const found = findVariant(i.variantId);
      if (!found) return null;
      return { ...i, product: found.product, variant: found.variant, lineTotal: found.variant.price * i.quantity };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { lines, subtotal, count };
}

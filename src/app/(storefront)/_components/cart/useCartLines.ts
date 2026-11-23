"use client";

import { applyLive } from "@storefront/_lib/live";
import { useLiveVariants } from "@storefront/_lib/live-catalogue";
import { findVariant } from "@storefront/_lib/products";
import { useCartItems } from "@storefront/_lib/store";
import { useDynamicCatalogue } from "@storefront/_lib/use-catalogue";

/** Joins persisted cart items with dynamic Firestore catalogue data and live stock/prices. */
export function useCartLines() {
  const items = useCartItems();
  const live = useLiveVariants();
  const { products } = useDynamicCatalogue();

  const lines = items
    .map((i) => {
      const found = findVariant(i.variantId, products);
      if (!found) return null;
      const variant = applyLive(found.variant, live);
      return { ...i, product: found.product, variant, lineTotal: variant.price * i.quantity };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { lines, subtotal, count };
}

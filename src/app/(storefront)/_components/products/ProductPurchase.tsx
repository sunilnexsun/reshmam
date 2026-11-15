"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { Product } from "@storefront/_lib/products";
import { formatINR } from "@storefront/_lib/pricing";
import { useLiveProduct } from "@storefront/_lib/live-catalogue";
import { VariantSelector, WishlistButton, addToCart } from "./ProductCard";
import { defaultVariantId, useSelectedVariant } from "./SelectedVariant";

export function ProductPurchase({ product: initial }: { product: Product }) {
  const product = useLiveProduct(initial);
  // On the product page the choice is shared with the photo; elsewhere it is kept here.
  const shared = useSelectedVariant();
  const [ownVariantId, setOwnVariantId] = useState(() => defaultVariantId(product));
  const variantId = shared?.variantId ?? ownVariantId;
  const setVariantId = shared?.setVariantId ?? setOwnVariantId;
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId)!;
  const inStock = variant.stock > 0;
  const maxQty = Math.max(1, Math.min(50, variant.stock));
  const quantity = Math.min(qty, maxQty);

  return (
    <div className="space-y-5">
      <p className="text-3xl font-bold text-ink" aria-live="polite">
        {formatINR(variant.price)}
        <span className="ml-2 align-middle text-sm font-normal text-ink-soft">({variant.label}, incl. taxes)</span>
      </p>
      <div>
        <p className="mb-2 text-sm font-semibold text-forest-900">Size</p>
        <VariantSelector product={product} value={variantId} onChange={setVariantId} size="lg" />
      </div>
      <p className={inStock ? "text-sm font-medium text-leaf-600" : "text-sm font-medium text-red-700"}>
        {inStock ? (variant.stock <= 10 ? `Only ${variant.stock} left in stock` : "In stock") : "Out of stock"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-md border border-beige-300 bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || !inStock}
            className="inline-flex h-11 w-11 items-center justify-center text-forest-800 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="w-10 text-center font-semibold" aria-live="polite" aria-label={`Quantity ${quantity}`}>
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty(Math.min(maxQty, quantity + 1))}
            disabled={quantity >= maxQty || !inStock}
            className="inline-flex h-11 w-11 items-center justify-center text-forest-800 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          disabled={!inStock}
          onClick={() => addToCart(product, variantId, quantity)}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-forest-800 px-6 text-sm font-semibold text-white hover:bg-forest-950 disabled:cursor-not-allowed disabled:bg-ink-soft/40 sm:flex-none"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          {inStock ? "Add to Cart" : "Out of Stock"}
        </button>
        <WishlistButton product={product} className="border border-beige-300" />
      </div>
    </div>
  );
}

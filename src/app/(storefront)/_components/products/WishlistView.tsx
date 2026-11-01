"use client";

import { Heart } from "lucide-react";
import { products } from "@storefront/_lib/products";
import { useWishlist } from "@storefront/_lib/store";
import { ProductGrid } from "./ProductCatalog";
import { ButtonLink } from "@storefront/_components/ui/primitives";

export function WishlistView() {
  const slugs = useWishlist();
  const saved = products.filter((p) => slugs.includes(p.slug));
  if (!saved.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-beige-300 bg-white/70 p-10 text-center">
        <Heart className="mx-auto h-12 w-12 text-rust" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold text-forest-800">No saved products yet</h2>
        <p className="mt-2 text-ink-soft">Tap the heart on any product to save it here.</p>
        <ButtonLink href="/products" className="mt-6">
          Browse Products
        </ButtonLink>
      </div>
    );
  }
  return <ProductGrid products={saved} />;
}

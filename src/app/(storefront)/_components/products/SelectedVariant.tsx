"use client";

import Image from "next/image";
import { createContext, useContext, useState, type ReactNode } from "react";
import { variantImage, type Product } from "@storefront/_lib/products";
import { useLiveProduct } from "@storefront/_lib/live-catalogue";

type Selection = { variantId: string; setVariantId: (id: string) => void };
const SelectedVariantContext = createContext<Selection | null>(null);

/** The first size that is in stock (or the first size), used as the initial selection. */
export function defaultVariantId(product: Product) {
  return (product.variants.find((v) => v.stock > 0) ?? product.variants[0]).id;
}

/**
 * Shares the chosen size on the product page, so the photo (ProductImage) follows the size picked in
 * ProductPurchase even though they sit in different columns.
 */
export function SelectedVariantProvider({ product, children }: { product: Product; children: ReactNode }) {
  const live = useLiveProduct(product);
  const [variantId, setVariantId] = useState(() => defaultVariantId(live));
  return <SelectedVariantContext value={{ variantId, setVariantId }}>{children}</SelectedVariantContext>;
}

export function useSelectedVariant() {
  return useContext(SelectedVariantContext);
}

/**
 * Product photo for the selected size (falls back to the product image).
 * Packshots ("contain") fill the whole tile: square on phones, the full height of the details column from lg up.
 */
export function ProductImage({ product }: { product: Product }) {
  const selection = useSelectedVariant();
  const variant = product.variants.find((v) => v.id === selection?.variantId);
  const src = variantImage(product, variant);
  const alt = variant ? `${product.imageAlt}, ${variant.label}` : product.imageAlt;
  if (product.imageFit === "contain") {
    return (
      <div className="relative aspect-square w-full lg:aspect-auto lg:h-full lg:min-h-[480px]">
        <Image src={src} alt={alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-contain p-6 sm:p-8" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={464}
      height={320}
      priority
      sizes="(min-width:1024px) 50vw, 100vw"
      className="aspect-[29/20] w-full object-cover"
    />
  );
}

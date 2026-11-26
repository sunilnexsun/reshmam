"use client";

import Image from "next/image";
import { createContext, useContext, useState, type ReactNode } from "react";
import { variantImage, type Product } from "@storefront/_lib/products";
import { useLiveProduct } from "@storefront/_lib/live-catalogue";

type Selection = { variantId: string; setVariantId: (id: string) => void };
const SelectedVariantContext = createContext<Selection | null>(null);

/** The first size that is in stock (or the first size), used as the initial selection. */
export function defaultVariantId(product: Product) {
  return (product.variants.find((v) => v.stock > 0) ?? product.variants[0])?.id ?? "";
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
 * The product's photos: the selected size's photo first, then the rest of the product's photos, with
 * thumbnails to switch between them. Choosing another size starts again on that size's photo.
 */
export function ProductImage({ product }: { product: Product }) {
  const selection = useSelectedVariant();
  const variant = product.variants.find((v) => v.id === selection?.variantId);
  const first = variantImage(product, variant);
  const photos = [first, ...(product.images ?? []).filter((src) => src !== first)];
  const alt = variant ? `${product.imageAlt}, ${variant.label}` : product.imageAlt;
  return <Gallery key={first} photos={photos} alt={alt} contain={product.imageFit === "contain"} />;
}

/**
 * Packshots ("contain") fill the whole tile: square on phones, the full height of the details column from lg up.
 */
function Gallery({ photos, alt, contain }: { photos: string[]; alt: string; contain: boolean }) {
  const [index, setIndex] = useState(0);
  const src = photos[index] ?? photos[0];
  const label = photos.length > 1 ? `${alt} (photo ${index + 1} of ${photos.length})` : alt;
  return (
    <div className="flex h-full flex-col">
      {contain ? (
        <div className="relative aspect-square w-full lg:aspect-auto lg:min-h-[480px] lg:flex-1">
          <Image src={src} alt={label} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-contain p-6 sm:p-8" />
        </div>
      ) : (
        <Image src={src} alt={label} width={464} height={320} priority sizes="(min-width:1024px) 50vw, 100vw" className="aspect-[29/20] w-full object-cover" />
      )}
      {photos.length > 1 && (
        <ul className="flex flex-wrap justify-center gap-3 border-t border-beige-300/80 p-4" aria-label="Product photos">
          {photos.map((photo, i) => (
            <li key={photo}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-pressed={i === index}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-white transition-colors sm:h-20 sm:w-20 ${
                  i === index ? "border-forest-800" : "border-beige-300 hover:border-forest-800/50"
                }`}
              >
                <Image src={photo} alt="" fill sizes="80px" className={contain ? "object-contain p-1" : "object-cover"} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

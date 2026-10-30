"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import type { BranchSlug, Product } from "@/lib/products";
import { branchName } from "@/lib/products";
import { priceRange } from "@/lib/products";
import { formatINR } from "@/lib/pricing";
import { cart, useWishlist, wishlist } from "@/lib/store";
import { toast } from "../ui/Toaster";
import { cn } from "../ui/primitives";

export function VariantSelector({
  product,
  value,
  onChange,
  size = "md",
}: {
  product: Product;
  value: string;
  onChange: (id: string) => void;
  size?: "md" | "lg";
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">Choose size for {product.shortName}</legend>
      <div className="flex flex-wrap gap-2">
        {product.variants.map((v) => {
          const checked = v.id === value;
          const out = v.stock <= 0;
          return (
            <label
              key={v.id}
              className={cn(
                "relative inline-flex cursor-pointer select-none items-center justify-center rounded-md border text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold",
                size === "lg"
                  ? "min-h-11 min-w-20 px-4"
                  : "min-h-9 min-w-[3.75rem] flex-1 px-2",
                checked
                  ? "border-forest-800 bg-forest-800 text-white"
                  : "border-beige-300 bg-white text-ink hover:border-forest-800",
                out &&
                  !checked &&
                  "text-ink-soft/60 line-through decoration-ink-soft/50",
              )}
            >
              <input
                type="radio"
                name={name}
                value={v.id}
                checked={checked}
                onChange={() => onChange(v.id)}
                className="sr-only"
              />
              {v.label}
              {out && <span className="sr-only"> (out of stock)</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Branch pill shown on every product (Velum Mayilum Branch / Reshmam Branch). */
export function BranchBadge({
  branch,
  className,
}: {
  branch: BranchSlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
        branch === "velum-mayilum"
          ? "bg-[#f3b04a] text-[#3a2200]"
          : "bg-forest-800 text-white",
        className,
      )}
    >
      {branchName(branch)}
    </span>
  );
}

export function WishlistButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const list = useWishlist();
  const saved = list.includes(product.slug);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove ${product.shortName} from wishlist`
          : `Add ${product.shortName} to wishlist`
      }
      onClick={() => {
        wishlist.toggle(product.slug);
        toast(
          saved ? "Removed from wishlist" : "Saved to wishlist",
          saved ? undefined : { href: "/wishlist", label: "View" },
        );
      }}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-rust shadow-sm transition-colors hover:bg-white",
        className,
      )}
    >
      <Heart className={cn("h-5 w-5", saved && "fill-current")} aria-hidden />
    </button>
  );
}

export function addToCart(product: Product, variantId: string, quantity = 1) {
  const v = product.variants.find((x) => x.id === variantId);
  if (!v || v.stock <= 0) return;
  cart.add(variantId, quantity);
  toast(`${product.shortName} (${v.label}) added to cart`, {
    href: "/cart",
    label: "View cart",
  });
}

export function ProductCard({
  product,
  priority,
}: {
  product: Product;
  priority?: boolean;
}) {
  const firstAvailable =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const variant = product.variants.find((v) => v.id === variantId)!;
  const range = priceRange(product);
  const inStock = variant.stock > 0;
  const lowStock = inStock && variant.stock <= 10;

  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-beige-300/80 bg-cream-50 p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-4">
      <WishlistButton
        product={product}
        className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5"
      />
      <Link
        href={`/products/${product.slug}`}
        className="block overflow-hidden rounded-lg bg-white"
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={product.image}
          alt={product.imageAlt}
          width={464}
          height={320}
          sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
          priority={priority}
          className={cn("aspect-[29/20] w-full transition-transform duration-500 group-hover:scale-[1.03]", product.imageFit === "contain" ? "object-contain px-2 pb-2 pt-9" : "object-cover")}
        />
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="font-sans text-base font-semibold leading-snug text-forest-900 sm:text-[17px]">
          <Link
            href={`/products/${product.slug}`}
            className="hover:underline underline-offset-4"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BranchBadge branch={product.branch} />
          {product.useLabel && (
            <span className="text-xs font-semibold text-rust">
              {product.useLabel}
            </span>
          )}
        </div>
        <div className="mt-3">
          <VariantSelector
            product={product}
            value={variantId}
            onChange={setVariantId}
          />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-[22px] font-bold text-ink" aria-live="polite">
            <span className="sr-only">Price for {variant.label}: </span>
            {formatINR(variant.price)}
          </p>
          {range.min !== range.max && (
            <p className="pb-1 text-xs text-ink-soft">
              {formatINR(range.min)} – {formatINR(range.max)}
            </p>
          )}
        </div>
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            !inStock
              ? "text-red-700"
              : lowStock
                ? "text-rust"
                : "text-leaf-600",
          )}
        >
          {!inStock
            ? "Out of stock"
            : lowStock
              ? `Only ${variant.stock} left`
              : "In stock"}
        </p>
        <div className="mt-auto pt-4" />
        <button
          type="button"
          disabled={!inStock}
          onClick={() => addToCart(product, variantId)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-forest-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-forest-950 disabled:cursor-not-allowed disabled:bg-ink-soft/40"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          {inStock ? "Add to Cart" : "Out of Stock"}
          <span className="sr-only">
            {" "}
            – {product.shortName}, {variant.label}
          </span>
        </button>
      </div>
    </article>
  );
}

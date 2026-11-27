"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCartLines } from "./useCartLines";
import { cart } from "@storefront/_lib/store";
import { formatINR, shippingFee } from "@storefront/_lib/pricing";
import { site } from "@storefront/_lib/site";
import { variantImage } from "@storefront/_lib/products";
import { ButtonLink } from "@storefront/_components/ui/primitives";

export function OrderSummary({
  subtotal,
  state,
  discount = 0,
  couponCode,
  children,
}: {
  subtotal: number;
  state?: string;
  discount?: number;
  couponCode?: string;
  children?: React.ReactNode;
}) {
  const shipping = shippingFee(subtotal, state);
  const remaining = site.shipping.freeThreshold - subtotal;
  const total = Math.max(0, subtotal - discount + shipping);
  return (
    <aside aria-label="Order summary" className="h-fit rounded-xl border border-beige-300/80 bg-white p-6 shadow-card lg:sticky lg:top-28">
      <h2 className="font-serif text-2xl font-bold text-forest-800">Order Summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-medium">{formatINR(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-leaf-600 font-medium">
            <dt>Coupon {couponCode ? `(${couponCode})` : ""}</dt>
            <dd>−{formatINR(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink-soft">Delivery {state ? `(${state})` : "(Tamil Nadu)"}</dt>
          <dd className="font-medium">{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-beige-300 pt-3 text-base">
          <dt className="font-semibold">Total</dt>
          <dd className="font-bold">{formatINR(total)}</dd>
        </div>
      </dl>
      {(!state || state === site.shipping.homeState) && remaining > 0 && subtotal > 0 && (
        <p className="mt-3 rounded-md bg-leaf-100 px-3 py-2 text-xs text-forest-900">
          Add {formatINR(remaining)} more for free delivery across Tamil Nadu.
        </p>
      )}
      <p className="mt-3 text-xs text-ink-soft">
        Prices include taxes. Final delivery charges are confirmed at checkout based on your address.
      </p>
      {children}
    </aside>
  );
}

export function CartView() {
  const { lines, subtotal } = useCartLines();

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-beige-300 bg-white/70 p-10 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-leaf-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold text-forest-800">Your cart is empty</h2>
        <p className="mt-2 text-ink-soft">Browse our cold pressed oils and add your favourites.</p>
        <ButtonLink href="/products" className="mt-6">
          Shop Our Oils
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <ul className="divide-y divide-beige-300 rounded-xl border border-beige-300/80 bg-white">
          {lines.map(({ product, variant, quantity, lineTotal, variantId }) => (
            <li key={variantId} className="flex gap-3 p-4 sm:gap-4 sm:p-5">
              <Link href={`/products/${product.slug}`} className="shrink-0">
                <Image src={variantImage(product, variant)} alt={`${product.imageAlt}, ${variant.label}`} width={120} height={84} className={product.imageFit === "contain" ? "h-16 w-16 rounded-lg bg-white object-contain sm:h-20 sm:w-28" : "h-16 w-16 rounded-lg object-cover sm:h-20 sm:w-28"} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-base font-semibold text-forest-900">
                    <Link href={`/products/${product.slug}`} className="hover:underline">
                      {product.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-ink-soft">
                    Size: {variant.label} · {formatINR(variant.price)} each
                  </p>
                  {variant.stock < quantity && (
                    <p className="text-xs font-medium text-red-700">Only {variant.stock} available</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <div className="inline-flex items-center rounded-md border border-beige-300">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${product.shortName} ${variant.label}`}
                      onClick={() => cart.setQuantity(variantId, quantity - 1)}
                      className="inline-flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10 text-forest-800"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
                      <span className="sr-only">Quantity </span>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${product.shortName} ${variant.label}`}
                      disabled={quantity >= Math.min(50, variant.stock)}
                      onClick={() => cart.setQuantity(variantId, quantity + 1)}
                      className="inline-flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10 text-forest-800 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="ml-auto text-right font-semibold sm:ml-0 sm:w-20">{formatINR(lineTotal)}</p>
                  <button
                    type="button"
                    aria-label={`Remove ${product.shortName} ${variant.label} from cart`}
                    onClick={() => cart.remove(variantId)}
                    className="inline-flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10 rounded-full text-ink-soft hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/products" className="font-semibold text-forest-800 hover:underline">
            ← Continue shopping
          </Link>
          <button type="button" onClick={() => cart.clear()} className="text-ink-soft hover:text-red-700 hover:underline">
            Clear cart
          </button>
        </div>
      </div>
      <OrderSummary subtotal={subtotal}>
        <ButtonLink href="/checkout" className="mt-5 w-full">
          Proceed to Checkout
        </ButtonLink>
      </OrderSummary>
    </div>
  );
}

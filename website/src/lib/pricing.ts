import { findVariant } from "./products";
import { site } from "./site";

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function shippingFee(subtotal: number, state?: string) {
  const { freeThreshold, tamilNaduFee, restOfIndiaFee, homeState } = site.shipping;
  if (subtotal <= 0) return 0;
  const inHomeState = !state || state.trim().toLowerCase() === homeState.toLowerCase();
  if (inHomeState && subtotal >= freeThreshold) return 0;
  return inHomeState ? tamilNaduFee : restOfIndiaFee;
}

export type PricedLine = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type PricingResult =
  | { ok: true; lines: PricedLine[]; subtotal: number; shipping: number; total: number }
  | { ok: false; error: string };

/**
 * Authoritative pricing. Only variant IDs and quantities are accepted from
 * the client; prices always come from the catalogue on the server.
 */
export function priceCart(items: { variantId: string; quantity: number }[], state?: string): PricingResult {
  if (!items.length) return { ok: false, error: "Your cart is empty." };
  const lines: PricedLine[] = [];
  for (const item of items) {
    const found = findVariant(item.variantId);
    if (!found) return { ok: false, error: "One of the items in your cart is no longer available." };
    const { product, variant } = found;
    if (variant.stock < item.quantity) {
      return {
        ok: false,
        error: `${product.shortName} (${variant.label}) has only ${variant.stock} in stock.`,
      };
    }
    lines.push({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantLabel: variant.label,
      unitPrice: variant.price,
      quantity: item.quantity,
      lineTotal: variant.price * item.quantity,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = shippingFee(subtotal, state);
  return { ok: true, lines, subtotal, shipping, total: subtotal + shipping };
}

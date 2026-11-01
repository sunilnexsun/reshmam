import { applyLive, type LiveVariants } from "./live";
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

/** Most units of one variant a single online order may hold; larger quantities go through bulk enquiries. */
export const MAX_UNITS_PER_VARIANT = 50;

/**
 * Authoritative pricing. Only variant IDs and quantities are accepted from
 * the client; prices always come from the catalogue on the server.
 * Lines for the same variant are merged first, so splitting a quantity across
 * several lines can't get past the stock check.
 * `live` supplies stock and prices from the database, which then take precedence over the catalogue (a
 * variant missing from it is treated as unavailable). `checkStock: false` skips the stock check.
 */
export function priceCart(
  items: { variantId: string; quantity: number }[],
  state?: string,
  { checkStock = true, live }: { checkStock?: boolean; live?: LiveVariants | null } = {},
): PricingResult {
  if (!items.length) return { ok: false, error: "Your cart is empty." };
  const merged = new Map<string, number>();
  for (const item of items) merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  const lines: PricedLine[] = [];
  for (const [variantId, quantity] of merged) {
    const found = findVariant(variantId);
    if (!found || (live && !live[variantId]?.active)) {
      return { ok: false, error: "One of the items in your cart is no longer available." };
    }
    const product = found.product;
    const variant = applyLive(found.variant, live);
    if (quantity > MAX_UNITS_PER_VARIANT) {
      return {
        ok: false,
        error: `You can order up to ${MAX_UNITS_PER_VARIANT} of ${product.shortName} (${variant.label}) online. For larger quantities, please send a bulk order enquiry.`,
      };
    }
    if (checkStock && variant.stock < quantity) {
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
      quantity,
      lineTotal: variant.price * quantity,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = shippingFee(subtotal, state);
  return { ok: true, lines, subtotal, shipping, total: subtotal + shipping };
}

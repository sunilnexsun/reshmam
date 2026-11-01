import { describe, expect, it } from "vitest";
import { MAX_UNITS_PER_VARIANT, priceCart, shippingFee } from "@storefront/_lib/pricing";
import { products } from "@storefront/_lib/products";
import { site } from "@storefront/_lib/site";

// Any variant with a little stock (more than 2, fewer than the cap) — the tests don't depend on which.
const inStock = products.flatMap((p) => p.variants).find((v) => v.stock > 2 && v.stock < MAX_UNITS_PER_VARIANT)!;

describe("priceCart", () => {
  it("has a suitable catalogue variant to test with", () => {
    expect(inStock).toBeDefined();
  });

  it("prices from the catalogue, never from the client", () => {
    const r = priceCart([{ variantId: inStock.id, quantity: 2 }]);
    expect(r.ok && r.lines[0].unitPrice).toBe(inStock.price);
    expect(r.ok && r.subtotal).toBe(inStock.price * 2);
  });

  it("merges lines for the same variant", () => {
    const r = priceCart([
      { variantId: inStock.id, quantity: 1 },
      { variantId: inStock.id, quantity: 2 },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(3);
    expect(r.lines[0].lineTotal).toBe(inStock.price * 3);
  });

  it("refuses a quantity split across lines that exceeds stock", () => {
    const r = priceCart([
      { variantId: inStock.id, quantity: inStock.stock },
      { variantId: inStock.id, quantity: 1 },
    ]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/in stock/);
  });

  it(`caps one variant at ${MAX_UNITS_PER_VARIANT} units per online order`, () => {
    const r = priceCart(
      [
        { variantId: inStock.id, quantity: 30 },
        { variantId: inStock.id, quantity: 30 },
      ],
      undefined,
      { checkStock: false },
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/bulk order enquiry/);
  });

  it("checks catalogue stock by default and skips it with checkStock: false", () => {
    const tooMany = [{ variantId: inStock.id, quantity: inStock.stock + 1 }];
    expect(priceCart(tooMany).ok).toBe(false);
    expect(priceCart(tooMany, undefined, { checkStock: false }).ok).toBe(true);
  });

  it("refuses unknown variants and empty carts", () => {
    expect(priceCart([{ variantId: "NOPE-1L", quantity: 1 }]).ok).toBe(false);
    expect(priceCart([]).ok).toBe(false);
  });
});

describe("priceCart with live database values", () => {
  const live = (over: Partial<{ stock: number; price: number; active: boolean }> = {}) => ({
    [inStock.id]: { stock: inStock.stock, price: inStock.price, active: true, ...over },
  });

  it("uses the database price over the catalogue", () => {
    const r = priceCart([{ variantId: inStock.id, quantity: 2 }], undefined, { live: live({ price: inStock.price + 15 }) });
    expect(r.ok && r.subtotal).toBe((inStock.price + 15) * 2);
  });
  it("checks the database stock, not the catalogue's", () => {
    expect(priceCart([{ variantId: inStock.id, quantity: 2 }], undefined, { live: live({ stock: 1 }) }).ok).toBe(false);
    expect(priceCart([{ variantId: inStock.id, quantity: inStock.stock + 5 }], undefined, { live: live({ stock: 40 }) }).ok).toBe(true);
  });
  it("treats inactive or missing variants as unavailable", () => {
    expect(priceCart([{ variantId: inStock.id, quantity: 1 }], undefined, { live: live({ active: false }) }).ok).toBe(false);
    expect(priceCart([{ variantId: inStock.id, quantity: 1 }], undefined, { live: {} }).ok).toBe(false);
  });
});

describe("shippingFee", () => {
  const { freeThreshold, tamilNaduFee, restOfIndiaFee, homeState } = site.shipping;
  it("is free in the home state at or above the threshold", () => {
    expect(shippingFee(freeThreshold, homeState)).toBe(0);
  });
  it("charges the home-state fee below the threshold", () => {
    expect(shippingFee(freeThreshold - 1, homeState)).toBe(tamilNaduFee);
  });
  it("charges the rest-of-India fee outside the home state, even above the threshold", () => {
    expect(shippingFee(freeThreshold * 2, "Kerala")).toBe(restOfIndiaFee);
  });
  it("is zero for an empty cart", () => {
    expect(shippingFee(0, homeState)).toBe(0);
  });
});

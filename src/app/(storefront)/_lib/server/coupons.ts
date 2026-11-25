import "server-only";
import { findDocByField, getDocData, updateDocData } from "@storefront/_lib/server/firestore-store";

export type CouponDoc = {
  id?: string;
  code?: string;
  description?: string;
  type?: string;
  value?: number;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  used?: number;
  validFrom?: string;
  validTo?: string;
  status?: string;
};

export type ValidatedCoupon = {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  discount: number;
};

export type CouponValidationResult =
  | { ok: true; coupon: ValidatedCoupon }
  | { ok: false; error: string };

const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Validates a coupon code against the live Firestore `coupons` collection
 * and computes the discount amount for the given cart subtotal.
 */
export async function validateAndCalculateCoupon(
  rawCode: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "Please enter a coupon code." };
  }

  const found = await findDocByField("coupons", "code", code);
  if (!found) {
    return { ok: false, error: `Coupon "${code}" is invalid.` };
  }

  const c = found.data as CouponDoc;
  const today = IST_DATE.format(new Date());

  if (String(c.status ?? "").toLowerCase() === "inactive") {
    return { ok: false, error: `Coupon "${code}" is currently inactive.` };
  }
  if (c.validFrom && c.validFrom > today) {
    return { ok: false, error: `Coupon "${code}" is not active until ${c.validFrom}.` };
  }
  if (c.validTo && c.validTo < today) {
    return { ok: false, error: `Coupon "${code}" has expired.` };
  }

  const usageLimit = Number(c.usageLimit ?? 0);
  const used = Number(c.used ?? 0);
  if (usageLimit > 0 && used >= usageLimit) {
    return { ok: false, error: `Coupon "${code}" has reached its usage limit.` };
  }

  const minOrder = Number(c.minOrder ?? 0);
  if (minOrder > 0 && subtotal < minOrder) {
    return {
      ok: false,
      error: `Minimum order of ₹${minOrder.toLocaleString("en-IN")} is required to use "${code}".`,
    };
  }

  const value = Number(c.value ?? 0);
  const type = String(c.type ?? "Flat");
  let discount = 0;

  if (type.toLowerCase() === "percentage") {
    discount = Math.round((subtotal * value) / 100);
    const maxDiscount = Number(c.maxDiscount ?? 0);
    if (maxDiscount > 0) {
      discount = Math.min(discount, maxDiscount);
    }
  } else {
    discount = Math.round(value);
  }

  discount = Math.max(0, Math.min(discount, subtotal));

  return {
    ok: true,
    coupon: {
      id: found.id,
      code,
      description: String(c.description || ""),
      type,
      value,
      discount,
    },
  };
}

/** Increments the `used` counter on a Firestore coupon document after order creation. */
export async function incrementCouponUsage(couponId: string): Promise<void> {
  try {
    const snap = await getDocData("coupons", couponId);
    if (!snap.exists) return;
    const currentUsed = Number(snap.data?.used ?? 0);
    await updateDocData("coupons", couponId, {
      used: currentUsed + 1,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Could not increment coupon usage:", couponId, err);
  }
}

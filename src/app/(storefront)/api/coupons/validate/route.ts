import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAndCalculateCoupon } from "@storefront/_lib/server/coupons";

const schema = z.object({
  code: z.string().trim().min(1, "Please enter a coupon code.").max(40),
  subtotal: z.number().nonnegative(),
});

/** Validates a coupon code against Firestore `coupons` for the cart/checkout UI. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid coupon request." },
      { status: 400 },
    );
  }

  try {
    const result = await validateAndCalculateCoupon(parsed.data.code, parsed.data.subtotal);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, coupon: result.coupon });
  } catch (err) {
    console.error("Coupon validation error:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to validate coupon right now. Please try again." },
      { status: 500 },
    );
  }
}

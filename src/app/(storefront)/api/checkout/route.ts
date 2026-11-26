import { NextResponse } from "next/server";
import { checkoutSchema, fieldErrors } from "@storefront/_lib/validation";
import { priceCart } from "@storefront/_lib/pricing";
import { clientIp, cashfreeConfig, razorpayConfig, rateLimit } from "@storefront/_lib/server/integrations";
import { fetchLiveVariants, fetchDynamicProducts } from "@storefront/_lib/server/catalogue";
import { createOrder, markOrderFailed, OutOfStockError } from "@storefront/_lib/server/orders";
import { validateAndCalculateCoupon } from "@storefront/_lib/server/coupons";
import { createCashfreeOrder } from "@/lib/cashfree";
import { verifyIdToken } from "@/lib/firebase-admin";
import { updateDocData } from "@storefront/_lib/server/firestore-store";

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }
  // Only signed-in customers can order: a valid Firebase ID token with a verified phone. A missing, expired or
  // forged token is refused, and the order is always linked to the account.
  const token = await verifyIdToken(req);
  if (!token?.phone_number) {
    return NextResponse.json(
      { ok: false, code: "login_required", error: "Please log in to place your order." },
      { status: 401 },
    );
  }
  const customer = { uid: token.uid, phone: token.phone_number };
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const cf = cashfreeConfig();
  const rzp = razorpayConfig();

  if (input.paymentMethod === "online" && !cf && !rzp) {
    return NextResponse.json(
      {
        ok: false,
        code: "payments_not_configured",
        error: "Cashfree payment gateway credentials are required. Please select Cash on Delivery or add CASHFREE_APP_ID & CASHFREE_SECRET_KEY in .env.local.",
      },
      { status: 503 },
    );
  }

  try {
    const [live, dynamicProducts] = await Promise.all([
      fetchLiveVariants(input.items.map((i) => i.variantId)),
      fetchDynamicProducts(),
    ]);
    const pricing = priceCart(input.items, input.address.state, { live, products: dynamicProducts });
    if (!pricing.ok) return NextResponse.json({ ok: false, error: pricing.error }, { status: 409 });

    let discount = 0;
    let couponCode: string | undefined;
    let couponId: string | undefined;

    if (input.couponCode && input.couponCode.trim()) {
      const couponRes = await validateAndCalculateCoupon(input.couponCode, pricing.subtotal);
      if (!couponRes.ok) {
        return NextResponse.json({ ok: false, error: couponRes.error }, { status: 400 });
      }
      discount = couponRes.coupon.discount;
      couponCode = couponRes.coupon.code;
      couponId = couponRes.coupon.id;
    }

    const finalTotal = Math.max(0, pricing.subtotal - discount + pricing.shipping);
    const finalPricing = {
      ...pricing,
      discount,
      total: finalTotal,
    };

    const order = await createOrder(
      input,
      finalPricing,
      {
        customer,
        branchId: "br_rs",
        paymentMethod: input.paymentMethod === "cod" ? "Cash on Delivery" : cf ? "UPI (Cashfree)" : "UPI (Razorpay)",
        couponCode,
        couponId,
      }
    );

    if (input.paymentMethod === "cod") {
      return NextResponse.json({ ok: true, orderNumber: order.orderNumber, token: order.accessToken });
    }

    // 1. Cashfree Payment Gateway flow (primary)
    if (cf) {
      try {
        const origin = new URL(req.url).origin;
        const returnUrl = `${origin}/api/payments/cashfree/verify?order_id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.accessToken)}`;

        const cfOrder = await createCashfreeOrder({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: finalTotal,
          customer: {
            id: order.id,
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
          },
          returnUrl,
        });

        await updateDocData("orders", order.id, {
          cashfreeOrderId: cfOrder.orderId,
          cashfreeCfOrderId: cfOrder.cfOrderId,
          cashfreePaymentSessionId: cfOrder.paymentSessionId,
        });

        return NextResponse.json({
          ok: true,
          gateway: "cashfree",
          orderNumber: order.orderNumber,
          token: order.accessToken,
          cashfree: {
            paymentSessionId: cfOrder.paymentSessionId,
            orderId: cfOrder.orderId,
            mode: cf.env,
          },
        });
      } catch (cfErr) {
        console.error("Cashfree order creation error:", cfErr);
        await markOrderFailed(order.id);
        return NextResponse.json(
          {
            ok: false,
            error: (cfErr instanceof Error && cfErr.message) || "We couldn't initiate Cashfree payment. Please try again or choose Cash on Delivery.",
          },
          { status: 502 }
        );
      }
    }

    // 2. Razorpay Fallback flow
    let res: Response;
    try {
      res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${rzp!.keyId}:${rzp!.keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalTotal * 100,
          currency: "INR",
          receipt: order.orderNumber,
          notes: { order_id: order.id },
        }),
      });
    } catch (err) {
      console.error("Could not reach Razorpay", err);
      await markOrderFailed(order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Nothing was charged. Please try again." }, { status: 502 });
    }
    if (!res.ok) {
      console.error("Razorpay order creation failed", res.status, await res.text().catch(() => ""));
      await markOrderFailed(order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Please try again." }, { status: 502 });
    }
    const rzpOrder = (await res.json()) as { id: string; amount: number; currency: string };

    try {
      await updateDocData("orders", order.id, {
        razorpay_order_id: rzpOrder.id,
        razorpayOrderId: rzpOrder.id,
      });
    } catch (linkErr) {
      console.error("Could not save the Razorpay order id in Firestore", linkErr);
      await markOrderFailed(order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Nothing was charged. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      gateway: "razorpay",
      orderNumber: order.orderNumber,
      token: order.accessToken,
      razorpay: {
        keyId: rzp!.keyId,
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return NextResponse.json(
        { ok: false, error: "One or more items in your cart just went out of stock. Please review your cart." },
        { status: 409 },
      );
    }
    console.error("Checkout failed:", err);
    return NextResponse.json({ ok: false, error: "Something went wrong placing your order. Please try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { checkoutSchema, fieldErrors } from "@storefront/_lib/validation";
import { priceCart } from "@storefront/_lib/pricing";
import { clientIp, getSupabaseAdmin, razorpayConfig, rateLimit } from "@storefront/_lib/server/integrations";
import { fetchLiveVariants } from "@storefront/_lib/server/catalogue";
import { createOrder, markOrderFailed, OutOfStockError } from "@storefront/_lib/server/orders";

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      {
        ok: false,
        code: "ordering_not_configured",
        error: "Online ordering is not enabled yet. No order was placed and nothing was charged.",
      },
      { status: 503 },
    );
  }
  const rzp = razorpayConfig();
  if (input.paymentMethod === "online" && !rzp) {
    return NextResponse.json(
      {
        ok: false,
        code: "payments_not_configured",
        error: "Online payment is not enabled yet. Please choose Cash on Delivery or contact us to order.",
      },
      { status: 503 },
    );
  }

  try {
    // Prices and stock are recalculated here — never trusted from the browser. The database's values win
    // over the catalogue's; place_order checks stock again under a row lock.
    const live = await fetchLiveVariants(db, input.items.map((i) => i.variantId));
    const pricing = priceCart(input.items, input.address.state, { live });
    if (!pricing.ok) return NextResponse.json({ ok: false, error: pricing.error }, { status: 409 });

    const order = await createOrder(db, input, pricing);

    if (input.paymentMethod === "cod") {
      return NextResponse.json({ ok: true, orderNumber: order.orderNumber, token: order.accessToken });
    }

    // Create the matching Razorpay order (amount in paise).
    // A network error here must not leave an unpaid order that is never marked failed.
    let res: Response;
    try {
      res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${rzp!.keyId}:${rzp!.keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: pricing.total * 100,
          currency: "INR",
          receipt: order.orderNumber,
          notes: { order_id: order.id },
        }),
      });
    } catch (err) {
      console.error("Could not reach Razorpay", err);
      await markOrderFailed(db, order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Nothing was charged. Please try again." }, { status: 502 });
    }
    if (!res.ok) {
      console.error("Razorpay order creation failed", res.status, await res.text().catch(() => ""));
      await markOrderFailed(db, order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Please try again." }, { status: 502 });
    }
    const rzpOrder = (await res.json()) as { id: string; amount: number; currency: string };
    // Without this link neither the verify call nor the webhook can find the order, so a payment
    // would be taken with no order to mark paid. Don't let the customer pay unless it's saved.
    const { error: linkErr } = await db.from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);
    if (linkErr) {
      console.error("Could not save the Razorpay order id", linkErr);
      await markOrderFailed(db, order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Nothing was charged. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
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
        { ok: false, error: "Sorry, one of the items in your cart just sold out. Please review your cart and try again." },
        { status: 409 },
      );
    }
    console.error("Checkout failed", err);
    return NextResponse.json({ ok: false, error: "We couldn't place your order. Nothing was charged. Please try again." }, { status: 500 });
  }
}

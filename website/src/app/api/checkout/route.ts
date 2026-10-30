import { NextResponse } from "next/server";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { priceCart } from "@/lib/pricing";
import { clientIp, getSupabaseAdmin, razorpayConfig, rateLimit } from "@/lib/server/integrations";
import { checkLiveStock, createOrder } from "@/lib/server/orders";

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

  // Prices are always recalculated here from the catalogue — never trusted from the browser.
  const pricing = priceCart(input.items, input.address.state);
  if (!pricing.ok) return NextResponse.json({ ok: false, error: pricing.error }, { status: 409 });

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
    const stockProblem = await checkLiveStock(db, pricing.lines);
    if (stockProblem) return NextResponse.json({ ok: false, error: stockProblem }, { status: 409 });

    const order = await createOrder(db, input, pricing);

    if (input.paymentMethod === "cod") {
      return NextResponse.json({ ok: true, orderNumber: order.orderNumber, token: order.accessToken });
    }

    // Create the matching Razorpay order (amount in paise).
    const res = await fetch("https://api.razorpay.com/v1/orders", {
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
    if (!res.ok) {
      console.error("Razorpay order creation failed", res.status, await res.text().catch(() => ""));
      await db.from("orders").update({ status: "payment_failed", payment_status: "failed" }).eq("id", order.id);
      return NextResponse.json({ ok: false, error: "We couldn't start the payment. Please try again." }, { status: 502 });
    }
    const rzpOrder = (await res.json()) as { id: string; amount: number; currency: string };
    await db.from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);

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
    console.error("Checkout failed", err);
    return NextResponse.json({ ok: false, error: "We couldn't place your order. Nothing was charged. Please try again." }, { status: 500 });
  }
}

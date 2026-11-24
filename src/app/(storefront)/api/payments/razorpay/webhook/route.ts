import { NextResponse } from "next/server";
import { getSupabaseAdmin, razorpayConfig } from "@storefront/_lib/server/integrations";
import { hmacHex, markOrderFailed, markOrderPaid, recordPaymentIssue, safeEqual } from "@storefront/_lib/server/orders";

type PaymentEntity = { id: string; order_id: string; amount: number; status: string };

/**
 * Razorpay webhook. Configure the `payment.captured`, `order.paid` and `payment.failed` events.
 * Any signed event gets a 200 so Razorpay stops retrying; money that can't be matched to an order is
 * recorded in payment_issues for staff instead of being dropped.
 */
export async function POST(req: Request) {
  const db = getSupabaseAdmin();
  const rzp = razorpayConfig();
  if (!db || !rzp?.webhookSecret) return NextResponse.json({ ok: false }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!safeEqual(hmacHex(rzp.webhookSecret, raw), signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = JSON.parse(raw) as { event: string; payload: { payment?: { entity: PaymentEntity } } };
  const payment = event.payload.payment?.entity;
  if (!payment) return NextResponse.json({ ok: true });

  const captured = event.event === "payment.captured" || event.event === "order.paid";
  if (!captured && event.event !== "payment.failed") return NextResponse.json({ ok: true });

  const { data: order, error } = await db
    .from("orders")
    .select("id, total_inr")
    .eq("razorpay_order_id", payment.order_id)
    .maybeSingle();
  if (error) throw error; // a 500 makes Razorpay retry later

  if (!order) {
    if (captured) {
      await recordPaymentIssue({ kind: "unknown_order", razorpayPaymentId: payment.id, razorpayOrderId: payment.order_id, amountPaise: payment.amount });
    }
    return NextResponse.json({ ok: true });
  }

  if (event.event === "payment.failed") {
    await markOrderFailed(order.id);
  } else if (payment.amount !== order.total_inr * 100) {
    await recordPaymentIssue({ kind: "amount_mismatch", razorpayPaymentId: payment.id, razorpayOrderId: payment.order_id, orderId: order.id, amountPaise: payment.amount });
  } else {
    await markOrderPaid(order.id, payment.id);
  }
  return NextResponse.json({ ok: true });
}

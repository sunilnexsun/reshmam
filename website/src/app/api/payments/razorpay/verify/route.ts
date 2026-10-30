import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, razorpayConfig } from "@/lib/server/integrations";
import { hmacHex, markOrderPaid, safeEqual } from "@/lib/server/orders";

const schema = z.object({
  orderNumber: z.string().min(5).max(40),
  token: z.string().min(10).max(80),
  razorpay_order_id: z.string().min(5).max(80),
  razorpay_payment_id: z.string().min(5).max(80),
  razorpay_signature: z.string().min(10).max(200),
});

/**
 * Called by the browser after Razorpay Checkout returns. The order is only
 * marked paid after (1) the signature is verified with our secret and
 * (2) the payment is confirmed with Razorpay's API for the right amount.
 */
export async function POST(req: Request) {
  const db = getSupabaseAdmin();
  const rzp = razorpayConfig();
  if (!db || !rzp) return NextResponse.json({ ok: false, error: "Payments are not configured." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payment response." }, { status: 400 });
  const p = parsed.data;

  const { data: order } = await db
    .from("orders")
    .select("id, access_token, razorpay_order_id, total_inr, payment_status")
    .eq("order_number", p.orderNumber)
    .maybeSingle();
  if (!order || !safeEqual(order.access_token, p.token) || order.razorpay_order_id !== p.razorpay_order_id) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const expected = hmacHex(rzp.keySecret, `${p.razorpay_order_id}|${p.razorpay_payment_id}`);
  if (!safeEqual(expected, p.razorpay_signature)) {
    return NextResponse.json({ ok: false, error: "Payment verification failed." }, { status: 400 });
  }

  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(p.razorpay_payment_id)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString("base64")}` },
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: "Could not confirm payment status." }, { status: 502 });
  const payment = (await res.json()) as { status: string; amount: number; order_id: string };
  const good =
    (payment.status === "captured" || payment.status === "authorized") &&
    payment.order_id === p.razorpay_order_id &&
    payment.amount === order.total_inr * 100;
  if (!good) return NextResponse.json({ ok: false, error: "Payment is not complete." }, { status: 402 });

  await markOrderPaid(db, order.id, p.razorpay_payment_id);
  return NextResponse.json({ ok: true });
}

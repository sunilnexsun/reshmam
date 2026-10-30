import { NextResponse } from "next/server";
import { getSupabaseAdmin, razorpayConfig } from "@/lib/server/integrations";
import { hmacHex, markOrderPaid, safeEqual } from "@/lib/server/orders";

/** Razorpay webhook (configure `payment.captured` and `order.paid` events). */
export async function POST(req: Request) {
  const db = getSupabaseAdmin();
  const rzp = razorpayConfig();
  if (!db || !rzp?.webhookSecret) return NextResponse.json({ ok: false }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!safeEqual(hmacHex(rzp.webhookSecret, raw), signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload: { payment?: { entity: { id: string; order_id: string; amount: number; status: string } } };
  };
  const payment = event.payload.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment) {
    const { data: order } = await db
      .from("orders")
      .select("id, total_inr")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();
    if (order && payment.amount === order.total_inr * 100) {
      await markOrderPaid(db, order.id, payment.id);
    }
  }
  return NextResponse.json({ ok: true });
}

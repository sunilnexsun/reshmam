import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, getSupabaseAdmin, rateLimit } from "@/lib/server/integrations";
import { safeEqual } from "@/lib/server/orders";

const schema = z.union([
  z.object({ orderNumber: z.string().trim().min(5).max(40), token: z.string().min(10).max(80) }),
  z.object({ orderNumber: z.string().trim().min(5).max(40), email: z.string().trim().email() }),
]);

/** Order status lookup for the confirmation page (token) and Track Order page (order number + email). */
export async function POST(req: Request) {
  if (!rateLimit(`lookup:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { ok: false, code: "not_configured", error: "Order tracking is not enabled yet. Please contact us for order updates." },
      { status: 503 },
    );
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Please enter a valid order number and email." }, { status: 400 });
  const q = parsed.data;

  const { data: order } = await db
    .from("orders")
    .select(
      "order_number, access_token, status, payment_method, payment_status, subtotal_inr, shipping_inr, total_inr, created_at, customers(email, name), order_items(product_name, variant_label, quantity, line_total_inr)",
    )
    .eq("order_number", q.orderNumber.toUpperCase())
    .maybeSingle();

  const customer = (Array.isArray(order?.customers) ? order?.customers[0] : order?.customers) as
    | { email: string; name: string }
    | undefined;
  const authorised =
    order &&
    ("token" in q
      ? safeEqual(order.access_token, q.token)
      : customer?.email?.toLowerCase() === q.email.toLowerCase());
  if (!order || !authorised) {
    return NextResponse.json({ ok: false, error: "We couldn't find an order with those details." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: order.order_number,
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      subtotal: order.subtotal_inr,
      shipping: order.shipping_inr,
      total: order.total_inr,
      createdAt: order.created_at,
      customerName: customer?.name,
      items: order.order_items,
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, getSupabaseAdmin, rateLimit } from "@storefront/_lib/server/integrations";
import { ORDER_VIEW_COLUMNS, orderCustomer, safeEqual, toOrderView } from "@storefront/_lib/server/orders";

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
    .select(ORDER_VIEW_COLUMNS)
    .eq("order_number", q.orderNumber.toUpperCase())
    .maybeSingle();

  const customer = order ? orderCustomer(order) : undefined;
  const authorised =
    order &&
    ("token" in q
      ? safeEqual(order.access_token, q.token)
      : customer?.email?.toLowerCase() === q.email.toLowerCase());
  if (!order || !authorised) {
    return NextResponse.json({ ok: false, error: "We couldn't find an order with those details." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order: toOrderView(order) });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@storefront/_lib/server/integrations";
import { orderCustomer, safeEqual, toOrderView, type OrderRow } from "@storefront/_lib/server/orders";
import { findDocByField, getDocData } from "@storefront/_lib/server/firestore-store";

const schema = z.union([
  z.object({ orderNumber: z.string().trim().min(5).max(40), token: z.string().min(10).max(80) }),
  z.object({ orderNumber: z.string().trim().min(5).max(40), email: z.string().trim().email() }),
]);

/** Order status lookup for confirmation page (token) and Track Order page (order number + email). */
export async function POST(req: Request) {
  if (!rateLimit(`lookup:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please enter a valid order number and email." }, { status: 400 });
  }
  const q = parsed.data;
  const num = q.orderNumber.trim().toUpperCase();

  try {
    let order: OrderRow | null = null;

    // 1. Try finding by order_number
    let found = await findDocByField("orders", "order_number", num);
    if (found) {
      order = { id: found.id, ...found.data };
    }

    // 2. Try finding by number
    if (!order) {
      found = await findDocByField("orders", "number", num);
      if (found) {
        order = { id: found.id, ...found.data };
      }
    }

    // 3. Try finding by document id
    if (!order) {
      const docSnap = await getDocData("orders", q.orderNumber.trim());
      if (docSnap.exists && docSnap.data) {
        order = { id: docSnap.id, ...docSnap.data };
      }
    }

    if (!order) {
      return NextResponse.json({ ok: false, error: "We couldn't find an order with those details." }, { status: 404 });
    }

    const customer = orderCustomer(order);
    const token = order.access_token || order.accessToken || "";
    const authorised =
      "token" in q
        ? (token && safeEqual(token, q.token))
        : (customer?.email && customer.email.toLowerCase() === q.email.toLowerCase());

    if (!authorised) {
      return NextResponse.json({ ok: false, error: "We couldn't find an order with those details." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order: toOrderView(order) });
  } catch (err) {
    console.error("Order lookup error in Firestore:", err);
    return NextResponse.json({ ok: false, error: "Unable to look up order at this time." }, { status: 500 });
  }
}

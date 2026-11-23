import { NextResponse, connection } from "next/server";
import { clientIp, getSupabaseAdmin, rateLimit } from "@storefront/_lib/server/integrations";
import { ORDER_VIEW_COLUMNS, toOrderView } from "@storefront/_lib/server/orders";

/** Most orders a signed-in customer sees on My Account. */
const LIMIT = 50;

/**
 * Orders for the signed-in customer (My Account). The browser sends its Supabase session token; we check it
 * with Supabase and list the orders placed with that account's email. Signing in proves the customer owns
 * the email (it's done by an emailed link), so this also finds orders placed as a guest before signing up.
 */
export async function GET(req: Request) {
  await connection();
  if (!rateLimit(`account-orders:${clientIp(req)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { ok: false, code: "not_configured", error: "Order history is not available yet." },
      { status: 503 },
    );
  }
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  const email = auth.user?.email_confirmed_at ? auth.user.email?.toLowerCase() : undefined;
  if (!email) return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });

  const { data, error } = await db
    .from("orders")
    .select(ORDER_VIEW_COLUMNS)
    .eq("customers.email", email)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) {
    console.error("Order history query failed", error);
    return NextResponse.json({ ok: false, error: "We couldn't load your orders. Please try again." }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, orders: (data ?? []).map(toOrderView) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

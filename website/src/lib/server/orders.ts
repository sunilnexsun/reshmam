import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricedLine } from "@/lib/pricing";
import type { CheckoutInput } from "@/lib/validation";

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `RSH-${ymd}-${rand}`;
}

export const newAccessToken = () => randomBytes(24).toString("base64url");

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Reads live stock from the database (when configured) and reports any shortfall. */
export async function checkLiveStock(db: SupabaseClient, lines: PricedLine[]) {
  const { data, error } = await db
    .from("product_variants")
    .select("id, stock, price_inr, active")
    .in(
      "id",
      lines.map((l) => l.variantId),
    );
  if (error) throw error;
  for (const line of lines) {
    const row = data?.find((r) => r.id === line.variantId);
    if (!row || !row.active) return `${line.productName} (${line.variantLabel}) is no longer available.`;
    if (row.stock < line.quantity) return `${line.productName} (${line.variantLabel}) has only ${row.stock} in stock.`;
    if (row.price_inr !== line.unitPrice) {
      // Catalogue and database are out of sync — refuse rather than charge an unexpected amount.
      return "Prices have changed. Please refresh the page and try again.";
    }
  }
  return null;
}

export async function createOrder(
  db: SupabaseClient,
  input: CheckoutInput,
  pricing: { lines: PricedLine[]; subtotal: number; shipping: number; total: number },
) {
  const { data: customer, error: cErr } = await db
    .from("customers")
    .insert({ name: input.customer.name, email: input.customer.email.toLowerCase(), phone: input.customer.phone })
    .select("id")
    .single();
  if (cErr) throw cErr;

  const { data: address, error: aErr } = await db
    .from("addresses")
    .insert({
      customer_id: customer.id,
      line1: input.address.line1,
      line2: input.address.line2 ?? null,
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  const orderNumber = newOrderNumber();
  const accessToken = newAccessToken();
  const isCod = input.paymentMethod === "cod";

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      access_token: accessToken,
      customer_id: customer.id,
      address_id: address.id,
      status: isCod ? "placed" : "pending_payment",
      payment_method: input.paymentMethod,
      payment_status: isCod ? "cod_pending" : "pending",
      subtotal_inr: pricing.subtotal,
      shipping_inr: pricing.shipping,
      total_inr: pricing.total,
    })
    .select("id")
    .single();
  if (oErr) throw oErr;

  const { error: iErr } = await db.from("order_items").insert(
    pricing.lines.map((l) => ({
      order_id: order.id,
      variant_id: l.variantId,
      product_name: l.productName,
      variant_label: l.variantLabel,
      unit_price_inr: l.unitPrice,
      quantity: l.quantity,
      line_total_inr: l.lineTotal,
    })),
  );
  if (iErr) throw iErr;

  if (isCod) {
    const { error } = await db.rpc("commit_order_stock", { p_order_id: order.id });
    if (error) throw error;
  }

  return { id: order.id as string, orderNumber, accessToken };
}

/** Marks an order paid (idempotent) and commits stock. */
export async function markOrderPaid(db: SupabaseClient, orderId: string, paymentId: string) {
  const { data, error } = await db
    .from("orders")
    .update({ status: "paid", payment_status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("id");
  if (error) throw error;
  if (data && data.length) {
    const { error: sErr } = await db.rpc("commit_order_stock", { p_order_id: orderId });
    if (sErr) throw sErr;
  }
}

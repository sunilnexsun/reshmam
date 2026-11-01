import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricedLine } from "@storefront/_lib/pricing";
import type { CheckoutInput } from "@storefront/_lib/validation";

/** The date part of an order number, in India time (servers usually run on UTC). */
const IST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

export function newOrderNumber(now = new Date()) {
  const ymd = IST_DATE.format(now).replaceAll("-", "");
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

/** Thrown when the database refuses an order because a variant sold out in the meantime. */
export class OutOfStockError extends Error {}

/**
 * Saves the customer, address, order and items in one database transaction (`place_order`).
 * Cash-on-delivery orders also commit their stock in that transaction, so an order is either
 * fully saved with its stock taken, or not saved at all.
 */
export async function createOrder(
  db: SupabaseClient,
  input: CheckoutInput,
  pricing: { lines: PricedLine[]; subtotal: number; shipping: number; total: number },
) {
  const orderNumber = newOrderNumber();
  const accessToken = newAccessToken();
  const { data: id, error } = await db.rpc("place_order", {
    p_customer: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
    p_address: {
      line1: input.address.line1,
      line2: input.address.line2 ?? null,
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
    },
    p_order: {
      order_number: orderNumber,
      access_token: accessToken,
      payment_method: input.paymentMethod,
      subtotal_inr: pricing.subtotal,
      shipping_inr: pricing.shipping,
      total_inr: pricing.total,
    },
    p_items: pricing.lines.map((l) => ({
      variant_id: l.variantId,
      product_name: l.productName,
      variant_label: l.variantLabel,
      unit_price_inr: l.unitPrice,
      quantity: l.quantity,
      line_total_inr: l.lineTotal,
    })),
  });
  if (error) {
    if (error.message.startsWith("insufficient_stock")) throw new OutOfStockError(error.message);
    throw error;
  }
  return { id: id as string, orderNumber, accessToken };
}

/**
 * Marks an order paid and commits its stock in one transaction (`mark_order_paid`). Safe to call
 * more than once: the browser's verify call and Razorpay's webhook can both arrive. If the stock
 * ran out before payment, the order is still marked paid and flagged `stock_shortfall` for staff.
 * A payment for an order that is already paid, refunded or cancelled is recorded in payment_issues.
 */
export async function markOrderPaid(db: SupabaseClient, orderId: string, paymentId: string) {
  const { error } = await db.rpc("mark_order_paid", { p_order_id: orderId, p_payment_id: paymentId });
  if (error) throw error;
}

/** Records a failed online payment on an order still awaiting payment (`mark_order_failed`). */
export async function markOrderFailed(db: SupabaseClient, orderId: string) {
  const { error } = await db.rpc("mark_order_failed", { p_order_id: orderId });
  if (error) console.error("Could not mark the order's payment as failed", orderId, error);
}

export type PaymentIssue = {
  kind: "amount_mismatch" | "unknown_order";
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  orderId?: string;
  amountPaise?: number;
};

/** Records money that arrived but couldn't be matched to an order, so staff can follow it up. */
export async function recordPaymentIssue(db: SupabaseClient, issue: PaymentIssue) {
  console.error("Payment needs attention", issue);
  const { error } = await db.from("payment_issues").upsert(
    {
      kind: issue.kind,
      razorpay_payment_id: issue.razorpayPaymentId,
      razorpay_order_id: issue.razorpayOrderId ?? null,
      order_id: issue.orderId ?? null,
      amount_paise: issue.amountPaise ?? null,
    },
    { onConflict: "razorpay_payment_id,kind", ignoreDuplicates: true },
  );
  if (error) console.error("Could not record the payment issue", error);
}

/** Columns needed to show an order to its customer (Track Order, confirmation page, My Account). */
export const ORDER_VIEW_COLUMNS =
  "order_number, access_token, status, payment_method, payment_status, subtotal_inr, shipping_inr, total_inr, created_at, customers!inner(email, name), order_items(product_name, variant_label, quantity, line_total_inr)";

type OrderRow = {
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal_inr: number;
  shipping_inr: number;
  total_inr: number;
  created_at: string;
  customers: { email: string; name: string } | { email: string; name: string }[] | null;
  order_items: unknown;
};

/** The order's customer, whichever shape Supabase returns the join in. */
export function orderCustomer(row: Pick<OrderRow, "customers">) {
  return (Array.isArray(row.customers) ? row.customers[0] : row.customers) ?? undefined;
}

/** What a customer may see of their order. Never includes the access token. */
export function toOrderView(row: OrderRow) {
  return {
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    subtotal: row.subtotal_inr,
    shipping: row.shipping_inr,
    total: row.total_inr,
    createdAt: row.created_at,
    customerName: orderCustomer(row)?.name,
    items: row.order_items,
  };
}

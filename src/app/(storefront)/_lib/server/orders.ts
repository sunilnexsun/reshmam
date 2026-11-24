import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PricedLine } from "@storefront/_lib/pricing";
import type { CheckoutInput } from "@storefront/_lib/validation";
import { adminDb } from "@/lib/firebase-admin";

/** The date part of an order number, in India time. */
const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function newOrderNumber(now?: Date) {
  if (now) {
    const ymd = IST_DATE.format(now).replaceAll("-", "");
    const rand = randomBytes(3).toString("hex").toUpperCase();
    return `RSH-${ymd}-${rand}`;
  }
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RSH-${rand}`;
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

export class OutOfStockError extends Error {}

/** A signed-in customer placing the order: their Firebase uid and verified phone (E.164). */
export type OrderCustomer = { uid: string; phone: string };

/**
 * Saves the order (and, for a guest, a customer record) through the Firebase Admin SDK.
 * A signed-in customer's order is linked to their account (customerId = uid, phone = verified phone), so it
 * shows in their order history; their own customers/{uid} profile is theirs, so no guest record is written.
 * Matches exact Firestore order schema: branchId, createdAt, customerEmail, customerId,
 * customerName, customerPhone, discount, id, items, number, paymentMethod, paymentStatus,
 * shipping, shippingAddress, status, stockDeducted, subtotal, tax, timeline, total, updatedAt.
 */
export async function createOrder(
  input: CheckoutInput,
  pricing: { lines: PricedLine[]; subtotal: number; shipping: number; total: number; discount?: number; tax?: number },
  options: { paymentMethod?: string; branchId?: string; customer?: OrderCustomer | null } = {}
) {
  const db = adminDb();
  const orderNumber = newOrderNumber();
  const accessToken = newAccessToken();
  const id = `o_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const customer = options.customer ?? null;
  const customerId = customer?.uid ?? `c_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;

  const discount = Number(pricing.discount ?? 0);
  const tax = Number(pricing.tax ?? Math.round(pricing.subtotal * 0.05));
  const branchId = options.branchId || "br_rs";
  const paymentMethod = options.paymentMethod || (input.paymentMethod === "cod" ? "Cash on Delivery" : "UPI (Cashfree)");
  const street = [input.address.line1, input.address.line2].filter(Boolean).join(", ");

  const orderDoc = {
    branchId,
    createdAt: now,
    customerEmail: input.customer.email,
    customerId,
    customerName: input.customer.name,
    customerPhone: customer?.phone ?? input.customer.phone,
    discount,
    id,
    items: pricing.lines.map((l) => ({
      name: l.productName,
      price: l.unitPrice,
      productId: l.productSlug || "",
      qty: l.quantity,
      size: l.variantLabel,
      subtotal: l.lineTotal,
      variantId: l.variantId,
    })),
    number: orderNumber,
    order_number: orderNumber,
    paymentMethod,
    paymentStatus: "Pending",
    shipping: pricing.shipping,
    shippingAddress: {
      city: input.address.city,
      pincode: input.address.pincode,
      state: input.address.state,
      street,
    },
    status: "Pending",
    stockDeducted: true,
    subtotal: pricing.subtotal,
    tax,
    timeline: [
      {
        at: now,
        by: "Customer",
        note: "Order placed",
        status: "Pending",
      },
    ],
    total: pricing.total,
    updatedAt: now,
    accessToken,
    access_token: accessToken,
  };

  await db.collection("orders").doc(id).set(orderDoc);

  // Stock deduction in Firestore variants
  for (const line of pricing.lines) {
    try {
      const vRef = db.collection("variants").doc(line.variantId);
      const vSnap = await vRef.get();
      if (vSnap.exists) {
        const vData = vSnap.data() ?? {};
        const currentStock = typeof vData.stock === "number" ? vData.stock : 0;
        await vRef.update({
          stock: Math.max(0, currentStock - line.quantity),
          updatedAt: now,
        });
      }
    } catch (e) {
      console.warn("Could not deduct stock for variant:", line.variantId, e);
    }
  }

  // Guest customer record (a signed-in customer's own profile at customers/{uid} is left alone).
  if (!customer) try {
    await db.collection("customers").doc(customerId).set(
      {
        id: customerId,
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        address: {
          street,
          city: input.address.city,
          state: input.address.state,
          pincode: input.address.pincode,
        },
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  } catch (e) {
    console.warn("Could not save customer doc:", e);
  }

  // Activity log sync in Firestore activities
  try {
    const actId = `ac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.collection("activities").doc(actId).set({
      id: actId,
      type: "orders",
      message: `New order ${orderNumber} placed by ${input.customer.name} (₹${pricing.total})`,
      at: now,
      user: "Customer",
    });
  } catch (e) {
    console.warn("Could not log activity:", e);
  }

  return { id, orderNumber, accessToken };
}

/** Marks an order paid in Firestore. */
export async function markOrderPaid(orderId: string, paymentId: string, method = "UPI (Cashfree)") {
  const now = new Date().toISOString();
  const db = adminDb();
  try {
    const oRef = db.collection("orders").doc(orderId);
    const snap = await oRef.get();
    if (snap.exists) {
      const data = snap.data() ?? {};
      const timeline = Array.isArray(data.timeline) ? data.timeline : [];
      await oRef.update({
        paymentStatus: "Paid",
        payment_status: "Paid",
        status: "Processing",
        paymentMethod: method,
        payment_method: method,
        paymentId,
        timeline: [
          ...timeline,
          {
            status: "Processing",
            note: `Payment confirmed (${paymentId}) via ${method}. Packing started.`,
            at: now,
            by: "Payment Gateway",
          },
        ],
        updatedAt: now,
      });

      try {
        const actId = `ac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.collection("activities").doc(actId).set({
          id: actId,
          type: "orders",
          message: `Order ${data.number || orderId} payment confirmed via ${method} (₹${data.total})`,
          at: now,
          user: "Payment Gateway",
        });
      } catch (e) {
        console.warn("Could not log activity:", e);
      }
    }
  } catch (err) {
    console.error("Could not mark order paid in Firestore:", orderId, err);
    throw err;
  }
}

/** Records a failed online payment in Firestore. */
export async function markOrderFailed(orderId: string) {
  try {
    await adminDb().collection("orders").doc(orderId).update({
      paymentStatus: "Failed",
      payment_status: "Failed",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Could not mark order failed in Firestore:", orderId, err);
  }
}

export type PaymentIssue = {
  kind: "amount_mismatch" | "unknown_order";
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  orderId?: string;
  amountPaise?: number;
};

export async function recordPaymentIssue(issue: PaymentIssue) {
  console.error("Payment needs attention", issue);
}

export const ORDER_VIEW_COLUMNS = "*";

export { orderCustomer, toOrderView, type OrderRow, type OrderRowItem } from "@storefront/_lib/order-view";

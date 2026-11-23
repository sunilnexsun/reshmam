import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PricedLine } from "@storefront/_lib/pricing";
import type { CheckoutInput } from "@storefront/_lib/validation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

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

/**
 * Saves the customer, address, order and items directly into Firestore.
 * Matches exact Firestore order schema: branchId, createdAt, customerEmail, customerId,
 * customerName, customerPhone, discount, id, items, number, paymentMethod, paymentStatus,
 * shipping, shippingAddress, status, stockDeducted, subtotal, tax, timeline, total, updatedAt.
 */
export async function createOrder(
  _dummyDb: unknown,
  input: CheckoutInput,
  pricing: { lines: PricedLine[]; subtotal: number; shipping: number; total: number; discount?: number; tax?: number },
  options: { paymentMethod?: string; branchId?: string } = {}
) {
  const orderNumber = newOrderNumber();
  const accessToken = newAccessToken();
  const id = `o_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const customerId = `c_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;

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
    customerPhone: input.customer.phone,
    discount,
    id,
    items: pricing.lines.map((l) => ({
      name: l.productName,
      price: l.unitPrice,
      productId: (l as any).productId || l.productSlug || "",
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

  await setDoc(doc(db, "orders", id), orderDoc);

  // Stock deduction in Firestore variants
  for (const line of pricing.lines) {
    try {
      const vRef = doc(db, "variants", line.variantId);
      const vSnap = await getDoc(vRef);
      if (vSnap.exists()) {
        const vData = vSnap.data();
        const currentStock = typeof vData.stock === "number" ? vData.stock : 0;
        await updateDoc(vRef, {
          stock: Math.max(0, currentStock - line.quantity),
          updatedAt: now,
        });
      }
    } catch (e) {
      console.warn("Could not deduct stock for variant:", line.variantId, e);
    }
  }

  // Customer collection sync in Firestore
  try {
    await setDoc(
      doc(db, "customers", customerId),
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
    await setDoc(doc(db, "activities", actId), {
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
export async function markOrderPaid(_dummyDb: unknown, orderId: string, paymentId: string, method = "UPI (Cashfree)") {
  const now = new Date().toISOString();
  try {
    const oRef = doc(db, "orders", orderId);
    const snap = await getDoc(oRef);
    if (snap.exists()) {
      const data = snap.data();
      const timeline = Array.isArray(data.timeline) ? data.timeline : [];
      await updateDoc(oRef, {
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
        await setDoc(doc(db, "activities", actId), {
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
export async function markOrderFailed(_dummyDb: unknown, orderId: string) {
  try {
    const oRef = doc(db, "orders", orderId);
    await updateDoc(oRef, {
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

export async function recordPaymentIssue(_dummyDb: unknown, issue: PaymentIssue) {
  console.error("Payment needs attention", issue);
}

export const ORDER_VIEW_COLUMNS = "*";

export function orderCustomer(row: Record<string, any>) {
  if (row.customer && typeof row.customer === "object") return row.customer;
  return {
    name: row.customerName || "",
    email: row.customerEmail || "",
    phone: row.customerPhone || "",
  };
}

export function toOrderView(row: Record<string, any>) {
  const cust = orderCustomer(row);
  return {
    orderNumber: row.order_number || row.number,
    status: row.status || "Pending",
    paymentMethod: row.payment_method || row.paymentMethod || "Cash on Delivery",
    paymentStatus: row.payment_status || row.paymentStatus || "Pending",
    subtotal: Number(row.subtotal_inr || row.subtotal || 0),
    shipping: Number(row.shipping_inr || row.shipping || 0),
    total: Number(row.total_inr || row.total || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    customerName: cust.name,
    items: (row.items || []).map((item: any) => ({
      product_name: item.product_name || item.name || "Product",
      variant_label: item.variant_label || item.size || "Standard",
      quantity: item.quantity || item.qty || 1,
      line_total_inr: item.line_total || item.total || 0,
    })),
  };
}

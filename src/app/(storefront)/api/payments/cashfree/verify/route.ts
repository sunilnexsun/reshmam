import { NextResponse, connection } from "next/server";
import { verifyCashfreeOrder } from "@/lib/cashfree";
import { adminDb } from "@/lib/firebase-admin";
import { markOrderPaid, markOrderFailed } from "@storefront/_lib/server/orders";

/**
 * Where Cashfree sends the customer back after paying. The order is marked paid only when Cashfree itself
 * confirms the payment for the order's full amount.
 *
 * `?test_status=PAID` (the checkout's "Simulate test payment" button) is honoured only outside production,
 * so nobody can mark a live order paid from the URL.
 */
async function handleVerification(req: Request) {
  await connection();
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");
  const token = url.searchParams.get("token") || "";
  const testParam =
    process.env.NODE_ENV !== "production" ? url.searchParams.get("test_status") || undefined : undefined;

  if (!orderId) {
    return NextResponse.redirect(new URL("/cart?error=missing_order_id", req.url));
  }

  try {
    const oRef = adminDb().collection("orders").doc(orderId);
    const snap = await oRef.get();
    const orderData = snap.data();
    if (!snap.exists || !orderData) {
      return NextResponse.redirect(new URL("/cart?error=order_not_found", req.url));
    }
    const orderNumber = String(orderData.number || orderData.order_number || orderId);
    const accessToken = String(token || orderData.accessToken || orderData.access_token || "");
    const confirmation = (extra = "") =>
      NextResponse.redirect(
        new URL(`/checkout/confirmation?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}${extra}`, req.url),
      );

    if (orderData.paymentStatus === "Paid" || orderData.status === "Processing" || orderData.status === "Delivered") {
      return confirmation();
    }

    const verification = await verifyCashfreeOrder(orderId, testParam);
    const fullAmount = testParam === "PAID" || Number(verification.orderAmount) === Number(orderData.total);

    if (verification.isPaid && fullAmount) {
      await markOrderPaid(orderId, verification.cfOrderId || `cf_${Date.now()}`, "UPI (Cashfree)");
      await oRef.update({
        cashfreeVerifiedAt: new Date().toISOString(),
        cashfreeAmount: verification.orderAmount,
        cashfreeCurrency: verification.orderCurrency,
      });
      return confirmation();
    }
    if (verification.isPaid) {
      console.error("Cashfree amount does not match the order", { orderId, paid: verification.orderAmount, total: orderData.total });
    }
    // Not paid yet (ACTIVE, USER_DROPPED, CANCELLED, FAILED) or not for the full amount.
    await markOrderFailed(orderId);
    return confirmation("&payment=pending");
  } catch (err) {
    console.error("Cashfree verification error:", err);
    return NextResponse.redirect(new URL("/cart?error=verification_failed", req.url));
  }
}

export async function GET(req: Request) {
  return handleVerification(req);
}

export async function POST(req: Request) {
  return handleVerification(req);
}

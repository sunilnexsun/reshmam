import { NextResponse, connection } from "next/server";
import { verifyCashfreeOrder } from "@/lib/cashfree";
import { markOrderPaid, markOrderFailed } from "@storefront/_lib/server/orders";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

async function handleVerification(req: Request) {
  await connection();
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");
  const token = url.searchParams.get("token") || "";
  const testParam = url.searchParams.get("test_status") || undefined;

  if (!orderId) {
    return NextResponse.redirect(new URL("/cart?error=missing_order_id", req.url));
  }

  try {
    const oRef = doc(db, "orders", orderId);
    const snap = await getDoc(oRef);
    if (!snap.exists()) {
      return NextResponse.redirect(new URL("/cart?error=order_not_found", req.url));
    }
    const orderData = snap.data();
    const orderNumber = orderData.number || orderData.order_number || orderId;
    const accessToken = token || orderData.accessToken || orderData.access_token || "";

    // If order is already paid, redirect straight to confirmation
    if (orderData.paymentStatus === "Paid" || orderData.status === "Processing" || orderData.status === "Delivered") {
      return NextResponse.redirect(
        new URL(
          `/checkout/confirmation?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}`,
          req.url
        )
      );
    }

    // Verify status with Cashfree (or test simulator)
    const verification = await verifyCashfreeOrder(orderId, testParam);

    if (verification.isPaid) {
      await markOrderPaid(null, orderId, verification.cfOrderId || `cf_${Date.now()}`, "UPI (Cashfree)");
      await updateDoc(oRef, {
        paymentStatus: "Paid",
        payment_status: "Paid",
        status: "Processing",
        cashfreeVerifiedAt: new Date().toISOString(),
        cashfreeAmount: verification.orderAmount,
        cashfreeCurrency: verification.orderCurrency,
      });

      return NextResponse.redirect(
        new URL(
          `/checkout/confirmation?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}`,
          req.url
        )
      );
    } else {
      // Payment not successful yet (ACTIVE, USER_DROPPED, CANCELLED, FAILED)
      await markOrderFailed(null, orderId);
      return NextResponse.redirect(
        new URL(
          `/checkout/confirmation?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}&payment=pending`,
          req.url
        )
      );
    }
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

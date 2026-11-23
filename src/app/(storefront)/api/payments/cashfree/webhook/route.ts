import { NextResponse, connection } from "next/server";
import { getCashfreeConfig, verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { markOrderPaid } from "@storefront/_lib/server/orders";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  await connection();
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const config = getCashfreeConfig();

    if (config.secretKey && signature && timestamp) {
      const isValid = verifyCashfreeWebhookSignature(rawBody, timestamp, signature, config.secretKey);
      if (!isValid) {
        console.warn("Cashfree webhook signature mismatch");
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || "{}");
    const data = payload?.data;
    const orderId = data?.order?.order_id || payload?.order_id;
    const paymentStatus = data?.payment?.payment_status || payload?.payment_status;
    const cfPaymentId = data?.payment?.cf_payment_id || payload?.cf_payment_id || `cf_${Date.now()}`;

    if (orderId && (paymentStatus === "SUCCESS" || payload?.type === "PAYMENT_SUCCESS_WEBHOOK")) {
      const oRef = doc(db, "orders", orderId);
      const snap = await getDoc(oRef);
      if (snap.exists() && snap.data().paymentStatus !== "Paid") {
        await markOrderPaid(null, orderId, String(cfPaymentId), "UPI (Cashfree)");
        await updateDoc(oRef, {
          paymentStatus: "Paid",
          status: "Processing",
          webhookReceivedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cashfree webhook processing error:", err);
    return NextResponse.json({ ok: false, error: "Webhook handling failed" }, { status: 500 });
  }
}

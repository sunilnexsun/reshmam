import { NextResponse, connection } from "next/server";
import { getCashfreeConfig, verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { adminDb } from "@/lib/firebase-admin";
import { markOrderPaid } from "@storefront/_lib/server/orders";

/**
 * Cashfree payment webhook. Every message must carry a valid signature (HMAC of timestamp + body with the
 * Cashfree secret); unsigned or wrongly signed messages are refused. An order is marked paid only for a
 * successful payment of its full amount.
 */
export async function POST(req: Request) {
  await connection();
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const config = getCashfreeConfig();

    if (!config.secretKey) {
      console.error("Cashfree webhook received but CASHFREE_SECRET_KEY is not set; ignoring it.");
      return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
    }
    if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature, config.secretKey)) {
      console.warn("Cashfree webhook signature missing or wrong");
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || "{}");
    const data = payload?.data;
    const orderId = data?.order?.order_id || payload?.order_id;
    const paymentStatus = data?.payment?.payment_status || payload?.payment_status;
    const cfPaymentId = data?.payment?.cf_payment_id || payload?.cf_payment_id || `cf_${Date.now()}`;
    const amount = Number(data?.payment?.payment_amount ?? data?.order?.order_amount ?? NaN);

    if (orderId && (paymentStatus === "SUCCESS" || payload?.type === "PAYMENT_SUCCESS_WEBHOOK")) {
      const oRef = adminDb().collection("orders").doc(String(orderId));
      const snap = await oRef.get();
      const order = snap.data();
      if (snap.exists && order && order.paymentStatus !== "Paid") {
        if (amount !== Number(order.total)) {
          console.error("Cashfree webhook amount does not match the order", { orderId, amount, total: order.total });
          return NextResponse.json({ ok: true });
        }
        await markOrderPaid(String(orderId), String(cfPaymentId), "UPI (Cashfree)");
        await oRef.update({ webhookReceivedAt: new Date().toISOString() });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cashfree webhook processing error:", err);
    return NextResponse.json({ ok: false, error: "Webhook handling failed" }, { status: 500 });
  }
}

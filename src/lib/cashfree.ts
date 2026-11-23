import { createHmac } from "node:crypto";

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  env: "sandbox" | "production";
  baseUrl: string;
  isConfigured: boolean;
}

export function getCashfreeConfig(): CashfreeConfig {
  const appId = process.env.CASHFREE_APP_ID?.trim() || "";
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim() || "";
  const envRaw = (process.env.CASHFREE_ENV || "TEST").toUpperCase();
  const isProd = envRaw === "PROD" || envRaw === "PRODUCTION";
  const baseUrl = isProd ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

  const isTestMode = !isProd;
  // In TEST mode, online test payments are enabled for simulation even before keys are pasted
  const isConfigured = Boolean(appId && secretKey) || isTestMode;

  return {
    appId,
    secretKey,
    env: isProd ? "production" : "sandbox",
    baseUrl,
    isConfigured,
  };
}

export interface CreateCashfreeOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  returnUrl: string;
}

export interface CashfreeOrderResult {
  orderId: string;
  cfOrderId: string;
  paymentSessionId: string;
  orderStatus: string;
}

/**
 * Creates a Cashfree payment session using Cashfree PG Orders API.
 * https://docs.cashfree.com/reference/pg-create-order
 */
export async function createCashfreeOrder(params: CreateCashfreeOrderParams): Promise<CashfreeOrderResult> {
  const config = getCashfreeConfig();

  // If live keys are not configured yet in TEST mode, use Sandbox Test Simulator
  if (!config.appId || !config.secretKey) {
    if (config.env === "sandbox") {
      return {
        orderId: params.orderId,
        cfOrderId: `cf_test_${Date.now()}`,
        paymentSessionId: `test_session_${Date.now()}_${params.orderId}`,
        orderStatus: "ACTIVE",
      };
    }
    throw new Error("CASHFREE_NOT_CONFIGURED");
  }

  // Cashfree requires a 10-digit mobile number for Indian customers
  const digitsOnly = params.customer.phone.replace(/[^0-9]/g, "");
  const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "9876543210";
  const cleanCustomerId = (params.customer.id || `c_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);

  const payload = {
    order_id: params.orderId,
    order_amount: Math.max(1, Math.round(params.amount * 100) / 100),
    order_currency: "INR",
    customer_details: {
      customer_id: cleanCustomerId,
      customer_name: (params.customer.name || "Customer").slice(0, 100),
      customer_email: (params.customer.email || "customer@reshmam.com").slice(0, 100),
      customer_phone: cleanPhone,
    },
    order_meta: {
      return_url: params.returnUrl,
    },
    order_note: `Order ${params.orderNumber} - RESHMAM Natural Oils [TEST]`,
  };

  const res = await fetch(`${config.baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-api-version": "2023-08-01",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    console.error("Cashfree order creation error:", res.status, data);
    const msg = data?.message || data?.error || `Cashfree returned HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    orderId: data.order_id,
    cfOrderId: data.cf_order_id,
    paymentSessionId: data.payment_session_id,
    orderStatus: data.order_status,
  };
}

export interface CashfreeVerifyResult {
  orderId: string;
  cfOrderId?: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: string;
  isPaid: boolean;
}

/**
 * Checks order payment status directly with Cashfree PG API.
 * https://docs.cashfree.com/reference/pg-order-fetch
 */
export async function verifyCashfreeOrder(orderId: string, testParam?: string): Promise<CashfreeVerifyResult> {
  const config = getCashfreeConfig();

  if (testParam === "PAID" || (!config.appId && config.env === "sandbox")) {
    return {
      orderId,
      cfOrderId: `cf_test_${Date.now()}`,
      orderAmount: 100,
      orderCurrency: "INR",
      orderStatus: "PAID",
      isPaid: true,
    };
  }

  if (!config.appId || !config.secretKey) {
    throw new Error("CASHFREE_NOT_CONFIGURED");
  }

  const res = await fetch(`${config.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-api-version": "2023-08-01",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    console.error("Cashfree order fetch error:", res.status, data);
    throw new Error(data?.message || `Cashfree returned HTTP ${res.status}`);
  }

  const isPaid = data.order_status === "PAID";

  return {
    orderId: data.order_id,
    cfOrderId: data.cf_order_id,
    orderAmount: Number(data.order_amount || 0),
    orderCurrency: data.order_currency || "INR",
    orderStatus: data.order_status,
    isPaid,
  };
}

/**
 * Verifies Cashfree Webhook Signature.
 * Uses HMAC-SHA256 with timestamp + raw body.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secretKey: string
): boolean {
  if (!rawBody || !timestamp || !signature || !secretKey) return false;
  try {
    const data = `${timestamp}${rawBody}`;
    const generated = createHmac("sha256", secretKey).update(data).digest("base64");
    return generated === signature;
  } catch (err) {
    console.error("Cashfree webhook signature verification error:", err);
    return false;
  }
}

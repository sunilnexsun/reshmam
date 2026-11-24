// Cashfree payment callbacks: an order is marked paid only when Cashfree confirms the full amount. The
// test-payment shortcut works only outside production, and webhooks must carry a valid signature.
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdminDb } from "../support/fake-admin-db";

const fb = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fb.db }));
vi.mock("next/server", async (orig) => ({ ...(await orig<object>()), connection: async () => {} }));

const SECRET = "cf_secret";
const cf = vi.hoisted(() => ({ fetchResult: { order_id: "o1", cf_order_id: "cf1", order_amount: 1260, order_currency: "INR", order_status: "PAID" } as Record<string, unknown> }));

let fake: ReturnType<typeof fakeAdminDb>;
beforeEach(() => {
  vi.stubEnv("CASHFREE_APP_ID", "app");
  vi.stubEnv("CASHFREE_SECRET_KEY", SECRET);
  vi.stubEnv("CASHFREE_ENV", "sandbox");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(cf.fetchResult)));
  fake = fakeAdminDb({ orders: { o1: { number: "RSH-1", total: 1260, paymentStatus: "Pending", status: "Pending", accessToken: "tok", timeline: [] } } });
  fb.db = fake.db;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const { GET: verify } = await import("@storefront/api/payments/cashfree/verify/route");
const { POST: webhook } = await import("@storefront/api/payments/cashfree/webhook/route");

const verifyUrl = (q: string) => new Request(`https://www.reshmam.com/api/payments/cashfree/verify?${q}`);

describe("GET /api/payments/cashfree/verify", () => {
  it("marks the order paid when Cashfree confirms the full amount", async () => {
    await verify(verifyUrl("order_id=o1&token=tok"));
    expect(fake.read("orders", "o1")?.paymentStatus).toBe("Paid");
  });
  it("doesn't mark it paid when Cashfree reports a different amount", async () => {
    cf.fetchResult = { ...cf.fetchResult, order_amount: 1 };
    await verify(verifyUrl("order_id=o1&token=tok"));
    expect(fake.read("orders", "o1")?.paymentStatus).not.toBe("Paid");
    cf.fetchResult = { ...cf.fetchResult, order_amount: 1260 };
  });
  it("ignores ?test_status=PAID in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    cf.fetchResult = { ...cf.fetchResult, order_status: "ACTIVE" };
    await verify(verifyUrl("order_id=o1&token=tok&test_status=PAID"));
    expect(fake.read("orders", "o1")?.paymentStatus).not.toBe("Paid");
    cf.fetchResult = { ...cf.fetchResult, order_status: "PAID" };
  });
});

describe("POST /api/payments/cashfree/webhook", () => {
  const body = JSON.stringify({ data: { order: { order_id: "o1", order_amount: 1260 }, payment: { payment_status: "SUCCESS", cf_payment_id: "pay1", payment_amount: 1260 } } });
  const signed = (raw: string, ts = "1700000000") => ({
    "x-webhook-timestamp": ts,
    "x-webhook-signature": createHmac("sha256", SECRET).update(`${ts}${raw}`).digest("base64"),
  });
  const send = (raw: string, headers: Record<string, string> = {}) =>
    webhook(new Request("https://www.reshmam.com/api/payments/cashfree/webhook", { method: "POST", body: raw, headers }));

  it("refuses a payment message with no signature", async () => {
    const res = await send(body);
    expect(res.status).toBe(401);
    expect(fake.read("orders", "o1")?.paymentStatus).toBe("Pending");
  });
  it("refuses a wrongly signed message", async () => {
    const res = await send(body, { "x-webhook-timestamp": "1", "x-webhook-signature": "bad" });
    expect(res.status).toBe(401);
    expect(fake.read("orders", "o1")?.paymentStatus).toBe("Pending");
  });
  it("marks the order paid for a correctly signed success message for the full amount", async () => {
    const res = await send(body, signed(body));
    expect(res.status).toBe(200);
    expect(fake.read("orders", "o1")?.paymentStatus).toBe("Paid");
  });
  it("doesn't mark it paid when the signed amount doesn't match the order", async () => {
    const cheap = body.replaceAll("1260", "1");
    await send(cheap, signed(cheap));
    expect(fake.read("orders", "o1")?.paymentStatus).toBe("Pending");
  });
});

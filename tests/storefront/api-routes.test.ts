// Route handlers with Supabase and Razorpay faked: a tiny query-builder stand-in for the database, a stubbed
// fetch for Razorpay's API, and spies for the order functions. Signatures use the real HMAC helpers.
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };
const results: Record<string, Result> = {};
const writes: { table: string; op: string; value: unknown }[] = [];
const filters: { table: string; column: string; value: unknown }[] = [];

/** A Supabase query builder stand-in: every call chains, and awaiting it resolves to results[table]. */
function query(table: string) {
  const result = () => results[table] ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "neq", "in", "order", "limit"]) builder[m] = () => builder;
  builder.eq = (column: string, value: unknown) => { filters.push({ table, column, value }); return builder; };
  for (const op of ["insert", "update", "upsert"]) builder[op] = (value: unknown) => { writes.push({ table, op, value }); return builder; };
  builder.maybeSingle = builder.single = () => Promise.resolve(result());
  builder.then = (resolve: (r: Result) => unknown) => resolve(result());
  return builder;
}
const db = { from: vi.fn((table: string) => query(table)), rpc: vi.fn(), auth: { getUser: vi.fn() } };
const config = { db: db as unknown, rzp: { keyId: "rzp_test_key", keySecret: "secret", webhookSecret: "whsec" } as unknown };

vi.mock("@storefront/_lib/server/integrations", () => ({
  getSupabaseAdmin: () => config.db,
  razorpayConfig: () => config.rzp,
  rateLimit: () => true,
  clientIp: () => "1.2.3.4",
  sendEmail: vi.fn(async () => ({ sent: false, reason: "not-configured" })),
}));
const orderFns = vi.hoisted(() => ({
  markOrderPaid: vi.fn(), markOrderFailed: vi.fn(), recordPaymentIssue: vi.fn(),
  createOrder: vi.fn<(...args: unknown[]) => Promise<{ id: string; orderNumber: string; accessToken: string }>>(
    async () => ({ id: "order-uuid", orderNumber: "RSH-20261101-ABCDEF", accessToken: "tok_abcdefghijklmnop" }),
  ),
}));
vi.mock("@storefront/_lib/server/orders", async (orig) => ({ ...(await orig<object>()), ...orderFns }));
vi.mock("@storefront/_lib/server/catalogue", () => ({
  fetchLiveVariants: async () => ({ "GIN-1L": { stock: 20, price: 600, active: true } }),
  getLiveVariants: async () => null,
}));

const { POST: verify } = await import("@storefront/api/payments/razorpay/verify/route");
const { POST: webhook } = await import("@storefront/api/payments/razorpay/webhook/route");
const { POST: lookup } = await import("@storefront/api/orders/lookup/route");
const { POST: contact } = await import("@storefront/api/contact/route");
const { POST: checkout } = await import("@storefront/api/checkout/route");
const { GET: accountOrders } = await import("@storefront/api/account/orders/route");

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://www.reshmam.com/api", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const hmac = (secret: string, s: string) => createHmac("sha256", secret).update(s).digest("hex");

beforeEach(() => {
  for (const k of Object.keys(results)) delete results[k];
  writes.length = 0;
  filters.length = 0;
  vi.clearAllMocks();
  config.db = db;
  config.rzp = { keyId: "rzp_test_key", keySecret: "secret", webhookSecret: "whsec" };
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/payments/razorpay/verify", () => {
  const body = (over = {}) => ({
    orderNumber: "RSH-20261101-ABCDEF", token: "tok_abcdefghijklmnop", razorpay_order_id: "order_123", razorpay_payment_id: "pay_123",
    razorpay_signature: hmac("secret", "order_123|pay_123"), ...over,
  });
  const order = { id: "order-uuid", access_token: "tok_abcdefghijklmnop", razorpay_order_id: "order_123", total_inr: 600, payment_status: "pending" };
  const payment = (status: string, amount = 60000) => vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status, amount, order_id: "order_123" })));

  it("marks a captured payment for the right amount paid", async () => {
    results.orders = { data: order, error: null };
    payment("captured");
    const res = await verify(post(body()));
    expect(res.status).toBe(200);
    expect(orderFns.markOrderPaid).toHaveBeenCalledWith(db, "order-uuid", "pay_123");
  });
  it("leaves an authorized (not yet captured) payment for the webhook", async () => {
    results.orders = { data: order, error: null };
    payment("authorized");
    expect((await verify(post(body()))).status).toBe(202);
    expect(orderFns.markOrderPaid).not.toHaveBeenCalled();
  });
  it("rejects a bad signature, a wrong token and a wrong amount", async () => {
    results.orders = { data: order, error: null };
    payment("captured", 100);
    expect((await verify(post(body({ razorpay_signature: "f".repeat(64) })))).status).toBe(400);
    expect((await verify(post(body({ token: "tok_wrongwrongwrong" })))).status).toBe(404);
    expect((await verify(post(body()))).status).toBe(400);
    expect(orderFns.markOrderPaid).not.toHaveBeenCalled();
  });
});

describe("POST /api/payments/razorpay/webhook", () => {
  const event = (name: string, amount = 60000) => JSON.stringify({ event: name, payload: { payment: { entity: { id: "pay_9", order_id: "order_123", amount, status: "x" } } } });
  const send = (raw: string, sig = hmac("whsec", raw)) => webhook(post(raw, { "x-razorpay-signature": sig }));

  it("rejects an unsigned or wrongly signed event", async () => {
    expect((await send(event("payment.captured"), "bad")).status).toBe(400);
    expect(orderFns.markOrderPaid).not.toHaveBeenCalled();
  });
  it("marks the order paid on payment.captured and order.paid", async () => {
    results.orders = { data: { id: "order-uuid", total_inr: 600 }, error: null };
    expect((await send(event("payment.captured"))).status).toBe(200);
    expect((await send(event("order.paid"))).status).toBe(200);
    expect(orderFns.markOrderPaid).toHaveBeenCalledTimes(2);
  });
  it("records a wrong amount instead of marking the order paid", async () => {
    results.orders = { data: { id: "order-uuid", total_inr: 600 }, error: null };
    await send(event("payment.captured", 100));
    expect(orderFns.markOrderPaid).not.toHaveBeenCalled();
    expect(orderFns.recordPaymentIssue).toHaveBeenCalledWith(db, expect.objectContaining({ kind: "amount_mismatch", orderId: "order-uuid" }));
  });
  it("records a payment for an unknown order", async () => {
    results.orders = { data: null, error: null };
    expect((await send(event("payment.captured"))).status).toBe(200);
    expect(orderFns.recordPaymentIssue).toHaveBeenCalledWith(db, expect.objectContaining({ kind: "unknown_order", razorpayOrderId: "order_123" }));
  });
  it("marks the order failed on payment.failed", async () => {
    results.orders = { data: { id: "order-uuid", total_inr: 600 }, error: null };
    await send(event("payment.failed"));
    expect(orderFns.markOrderFailed).toHaveBeenCalledWith(db, "order-uuid");
    expect(orderFns.markOrderPaid).not.toHaveBeenCalled();
  });
});

describe("POST /api/orders/lookup", () => {
  const row = { order_number: "RSH-1", access_token: "tok_abcdefghijklmnop", status: "placed", payment_method: "cod", payment_status: "cod_pending", subtotal_inr: 600, shipping_inr: 0, total_inr: 600, created_at: "2026-11-01", customers: { email: "Buyer@Example.com", name: "Buyer" }, order_items: [] };

  it("finds an order by number and email (any case) or by its token", async () => {
    results.orders = { data: row, error: null };
    expect((await lookup(post({ orderNumber: "RSH-1", email: "buyer@example.com" }))).status).toBe(200);
    expect((await lookup(post({ orderNumber: "RSH-1", token: "tok_abcdefghijklmnop" }))).status).toBe(200);
  });
  it("gives the same 404 for a wrong email, a wrong token or no order", async () => {
    results.orders = { data: row, error: null };
    expect((await lookup(post({ orderNumber: "RSH-1", email: "someone@else.com" }))).status).toBe(404);
    expect((await lookup(post({ orderNumber: "RSH-1", token: "tok_wrongwrongwrong" }))).status).toBe(404);
    results.orders = { data: null, error: null };
    expect((await lookup(post({ orderNumber: "RSH-1", email: "buyer@example.com" }))).status).toBe(404);
  });
  it("never returns the access token", async () => {
    results.orders = { data: row, error: null };
    const data = await (await lookup(post({ orderNumber: "RSH-1", email: "buyer@example.com" }))).json();
    expect(JSON.stringify(data)).not.toContain("tok_abcdefghijklmnop");
  });
});

describe("POST /api/contact", () => {
  const enquiry = (over = {}) => ({ name: "Test Person", email: "t@example.com", subject: "general", message: "Hello there, testing the form.", startedAt: Date.now() - 10_000, ...over });

  it("silently drops honeypot, too-fast and missing-start-time submissions", async () => {
    for (const body of [enquiry({ website: "spam" }), enquiry({ startedAt: Date.now() }), enquiry({ startedAt: undefined })]) {
      const res = await contact(post(body));
      expect(res.status).toBe(200);
    }
    expect(writes).toHaveLength(0);
  });
  it("stores a real enquiry", async () => {
    results.contact_enquiries = { data: null, error: null };
    expect((await contact(post(enquiry()))).status).toBe(200);
    expect(writes).toEqual([expect.objectContaining({ table: "contact_enquiries", op: "insert" })]);
  });
  it("says honestly when nothing is connected", async () => {
    config.db = null;
    const res = await contact(post(enquiry()));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/checkout", () => {
  const order = (method: "cod" | "online") => ({
    customer: { name: "Test Buyer", email: "buyer@example.com", phone: "9876543210" },
    address: { line1: "1 Main Road", city: "Kovilpatti", state: "Tamil Nadu", pincode: "628502" },
    paymentMethod: method,
    items: [{ variantId: "GIN-1L", quantity: 2 }],
  });

  it("rejects invalid input and reports when ordering isn't set up", async () => {
    expect((await checkout(post({}))).status).toBe(400);
    config.db = null;
    expect((await checkout(post(order("cod")))).status).toBe(503);
  });
  it("places a cash-on-delivery order priced from the database", async () => {
    const res = await checkout(post(order("cod")));
    expect(res.status).toBe(200);
    const pricing = orderFns.createOrder.mock.calls[0][2] as { subtotal: number };
    expect(pricing.subtotal).toBe(1200); // 2 × the live price of 600
  });
  it("refuses more than the database has in stock", async () => {
    const res = await checkout(post({ ...order("cod"), items: [{ variantId: "GIN-1L", quantity: 21 }] }));
    expect(res.status).toBe(409);
    expect(orderFns.createOrder).not.toHaveBeenCalled();
  });
  it("marks the order failed when Razorpay can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const res = await checkout(post(order("online")));
    expect(res.status).toBe(502);
    expect(orderFns.markOrderFailed).toHaveBeenCalledWith(db, "order-uuid");
  });
  it("links the Razorpay order and returns it for an online payment", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "order_rzp_1", amount: 120000, currency: "INR" })));
    results.orders = { data: null, error: null };
    const data = await (await checkout(post(order("online")))).json();
    expect(data).toMatchObject({ ok: true, razorpay: { orderId: "order_rzp_1", amount: 120000 } });
    expect(writes).toContainEqual({ table: "orders", op: "update", value: { razorpay_order_id: "order_rzp_1" } });
  });
});

describe("GET /api/account/orders", () => {
  const get = (token?: string) =>
    accountOrders(new Request("https://www.reshmam.com/api/account/orders", { headers: token ? { authorization: `Bearer ${token}` } : {} }));
  const user = (over = {}) => ({ data: { user: { email: "Buyer@Example.com", email_confirmed_at: "2026-11-01T00:00:00Z", ...over } }, error: null });
  const row = { order_number: "RSH-1", access_token: "tok_abcdefghijklmnop", status: "shipped", payment_method: "cod", payment_status: "cod_pending", subtotal_inr: 600, shipping_inr: 0, total_inr: 600, created_at: "2026-11-01", customers: { email: "buyer@example.com", name: "Buyer" }, order_items: [] };

  it("lists the signed-in customer's orders by their email, without access tokens", async () => {
    db.auth.getUser.mockResolvedValue(user());
    results.orders = { data: [row], error: null };
    const res = await get("session-token");
    expect(res.status).toBe(200);
    expect(db.auth.getUser).toHaveBeenCalledWith("session-token");
    expect(filters).toContainEqual({ table: "orders", column: "customers.email", value: "buyer@example.com" });
    const data = await res.json();
    expect(data.orders).toEqual([expect.objectContaining({ orderNumber: "RSH-1", status: "shipped", total: 600 })]);
    expect(JSON.stringify(data)).not.toContain("tok_abcdefghijklmnop");
  });
  it("refuses a missing or invalid session, or an unconfirmed email", async () => {
    expect((await get()).status).toBe(401);
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    expect((await get("bad")).status).toBe(401);
    db.auth.getUser.mockResolvedValue(user({ email_confirmed_at: null }));
    expect((await get("unconfirmed")).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("says so when the database isn't connected", async () => {
    config.db = null;
    expect((await get("session-token")).status).toBe(503);
  });
});

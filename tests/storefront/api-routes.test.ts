// Route handlers with their services faked: a tiny query-builder stand-in for Supabase, an in-memory stand-in
// for the Firestore calls the order routes make, a stubbed Cashfree client and fetch for Razorpay's API, and
// spies for the order functions. Signatures use the real HMAC helpers.
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
const config = {
  db: db as unknown,
  rzp: { keyId: "rzp_test_key", keySecret: "secret", webhookSecret: "whsec" } as unknown,
  cf: null as unknown,
};

/** Orders "in Firestore" and the document updates the routes make. */
const store = vi.hoisted(() => ({
  orders: [] as Record<string, unknown>[],
  updates: [] as { path: string; value: unknown }[],
}));
// The order routes use the Firebase Admin SDK: a small stand-in over `store`, plus ID tokens by name.
const idTokens: Record<string, { uid: string; phone_number?: string }> = {
  "good-token": { uid: "u1", phone_number: "+919999999999" },
};
vi.mock("@/lib/firebase-admin", () => {
  type Row = Record<string, unknown>;
  const snap = (o: Row | undefined, id: string) => ({ id, exists: Boolean(o), data: () => o });
  const query = (conds: [string, unknown][]) => ({
    where: (field: string, _op: string, value: unknown) => query([...conds, [field, value]]),
    limit: () => query(conds),
    get: async () => {
      const docs = store.orders.filter((o) => conds.every(([f, v]) => o[f] === v)).map((o) => snap(o, String(o.id)));
      return { empty: docs.length === 0, docs };
    },
  });
  const docRef = (col: string, id: string) => ({
    get: async () => snap(col === "orders" ? store.orders.find((o) => o.id === id) : undefined, id),
    update: async (value: unknown) => void store.updates.push({ path: `${col}/${id}`, value }),
    set: async (value: unknown) => void store.updates.push({ path: `${col}/${id}`, value }),
  });
  return {
    adminDb: () => ({ collection: (col: string) => ({ ...query([]), doc: (id: string) => docRef(col, id) }) }),
    verifyIdToken: async (req: Request) => idTokens[req.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""] ?? null,
  };
});
const cashfree = vi.hoisted(() => ({ createCashfreeOrder: vi.fn() }));
vi.mock("@/lib/cashfree", () => cashfree);
// Next's request-scoped APIs need a real request context, which a direct handler call doesn't have.
vi.mock("next/server", async (orig) => ({ ...(await orig<object>()), connection: async () => {} }));

vi.mock("@storefront/_lib/server/integrations", () => ({
  getSupabaseAdmin: () => config.db,
  razorpayConfig: () => config.rzp,
  cashfreeConfig: () => config.cf,
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
  fetchDynamicProducts: async () => [
    {
      slug: "gingelly-oil", name: "Gingelly Oil", shortName: "Gingelly Oil", category: "gingelly-oil", kind: "single",
      branch: "reshmam", image: "", imageAlt: "", summary: "", description: [], uses: [], edible: true,
      // The catalogue's own price and stock; the live values above must win.
      variants: [{ id: "GIN-1L", label: "1 L", price: 999, stock: 999 }],
    },
  ],
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
  config.cf = null;
  store.orders.length = 0;
  store.updates.length = 0;
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
    expect(orderFns.markOrderPaid).toHaveBeenCalledWith("order-uuid", "pay_123");
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
    expect(orderFns.recordPaymentIssue).toHaveBeenCalledWith(expect.objectContaining({ kind: "amount_mismatch", orderId: "order-uuid" }));
  });
  it("records a payment for an unknown order", async () => {
    results.orders = { data: null, error: null };
    expect((await send(event("payment.captured"))).status).toBe(200);
    expect(orderFns.recordPaymentIssue).toHaveBeenCalledWith(expect.objectContaining({ kind: "unknown_order", razorpayOrderId: "order_123" }));
  });
  it("marks the order failed on payment.failed", async () => {
    results.orders = { data: { id: "order-uuid", total_inr: 600 }, error: null };
    await send(event("payment.failed"));
    expect(orderFns.markOrderFailed).toHaveBeenCalledWith("order-uuid");
    expect(orderFns.markOrderPaid).not.toHaveBeenCalled();
  });
});

describe("POST /api/orders/lookup", () => {
  const row = { id: "order-uuid", order_number: "RSH-1", accessToken: "tok_abcdefghijklmnop", status: "Pending", paymentMethod: "Cash on Delivery", paymentStatus: "Pending", subtotal: 600, shipping: 0, total: 600, createdAt: "2026-11-01", customerEmail: "Buyer@Example.com", customerName: "Buyer", items: [] };

  it("finds an order by number and email (any case) or by its token", async () => {
    store.orders.push(row);
    expect((await lookup(post({ orderNumber: "RSH-1", email: "buyer@example.com" }))).status).toBe(200);
    expect((await lookup(post({ orderNumber: "RSH-1", token: "tok_abcdefghijklmnop" }))).status).toBe(200);
  });
  it("gives the same 404 for a wrong email, a wrong token or no order", async () => {
    store.orders.push(row);
    expect((await lookup(post({ orderNumber: "RSH-1", email: "someone@else.com" }))).status).toBe(404);
    expect((await lookup(post({ orderNumber: "RSH-1", token: "tok_wrongwrongwrong" }))).status).toBe(404);
    store.orders.length = 0;
    expect((await lookup(post({ orderNumber: "RSH-1", email: "buyer@example.com" }))).status).toBe(404);
  });
  it("never returns the access token", async () => {
    store.orders.push(row);
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

  it("rejects invalid input and reports when online payment isn't set up", async () => {
    expect((await checkout(post({}))).status).toBe(400);
    config.rzp = null;
    const res = await checkout(post(order("online")));
    expect(res.status).toBe(503);
    expect(orderFns.createOrder).not.toHaveBeenCalled();
  });
  it("places a cash-on-delivery order priced from the database", async () => {
    const res = await checkout(post(order("cod")));
    expect(res.status).toBe(200);
    const pricing = orderFns.createOrder.mock.calls[0][1] as { subtotal: number };
    expect(pricing.subtotal).toBe(1200); // 2 × the live price of 600, not the catalogue's 999
  });
  it("places a guest order when no one is signed in", async () => {
    await checkout(post(order("cod")));
    expect(orderFns.createOrder.mock.calls[0][2]).toMatchObject({ customer: null });
  });
  it("links the order to a signed-in customer, using the verified phone over the form's", async () => {
    await checkout(post(order("cod"), { authorization: "Bearer good-token" }));
    expect(orderFns.createOrder.mock.calls[0][2]).toMatchObject({ customer: { uid: "u1", phone: "+919999999999" } });
  });
  it("treats an expired or forged token as a guest order, not an error", async () => {
    const res = await checkout(post(order("cod"), { authorization: "Bearer forged" }));
    expect(res.status).toBe(200);
    expect(orderFns.createOrder.mock.calls[0][2]).toMatchObject({ customer: null });
  });
  it("refuses more than the database has in stock", async () => {
    const res = await checkout(post({ ...order("cod"), items: [{ variantId: "GIN-1L", quantity: 21 }] }));
    expect(res.status).toBe(409);
    expect(orderFns.createOrder).not.toHaveBeenCalled();
  });
  it("starts a Cashfree payment and saves its session on the order", async () => {
    config.cf = { env: "sandbox" };
    cashfree.createCashfreeOrder.mockResolvedValue({ orderId: "order-uuid", cfOrderId: "cf_1", paymentSessionId: "session_1" });
    const data = await (await checkout(post(order("online")))).json();
    expect(data).toMatchObject({ ok: true, gateway: "cashfree", cashfree: { paymentSessionId: "session_1", mode: "sandbox" } });
    expect(cashfree.createCashfreeOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 1260 })); // 1200 + ₹60 Tamil Nadu delivery
    expect(store.updates).toContainEqual({ path: "orders/order-uuid", value: expect.objectContaining({ cashfreePaymentSessionId: "session_1" }) });
  });
  it("marks the order failed when Cashfree can't start the payment", async () => {
    config.cf = { env: "sandbox" };
    cashfree.createCashfreeOrder.mockRejectedValue(new Error("Cashfree is down"));
    const res = await checkout(post(order("online")));
    expect(res.status).toBe(502);
    expect(orderFns.markOrderFailed).toHaveBeenCalledWith("order-uuid");
  });
  it("falls back to Razorpay without Cashfree, and marks the order failed when Razorpay can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const res = await checkout(post(order("online")));
    expect(res.status).toBe(502);
    expect(orderFns.markOrderFailed).toHaveBeenCalledWith("order-uuid");
  });
  it("links the Razorpay order and returns it for an online payment", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "order_rzp_1", amount: 120000, currency: "INR" })));
    const data = await (await checkout(post(order("online")))).json();
    expect(data).toMatchObject({ ok: true, razorpay: { orderId: "order_rzp_1", amount: 120000 } });
    expect(store.updates).toContainEqual({ path: "orders/order-uuid", value: expect.objectContaining({ razorpay_order_id: "order_rzp_1" }) });
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

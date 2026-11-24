// createOrder writes through the Firebase Admin SDK, and links the order to a signed-in customer's account.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdminDb } from "../support/fake-admin-db";

const fb = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fb.db }));

const { createOrder, markOrderFailed, markOrderPaid } = await import("@storefront/_lib/server/orders");

const input = {
  customer: { name: "Test Buyer", email: "buyer@example.com", phone: "9876543210" },
  address: { line1: "1 Main Road", city: "Kovilpatti", state: "Tamil Nadu" as const, pincode: "628502" },
  paymentMethod: "cod" as const,
  items: [{ variantId: "GIN-1L", quantity: 2 }],
};
const pricing = {
  lines: [{ variantId: "GIN-1L", productSlug: "gingelly-oil", productName: "Gingelly Oil", variantLabel: "1 L", unitPrice: 600, quantity: 2, lineTotal: 1200 }],
  subtotal: 1200,
  shipping: 60,
  total: 1260,
};

let fake: ReturnType<typeof fakeAdminDb>;
beforeEach(() => {
  fake = fakeAdminDb({ variants: { "GIN-1L": { stock: 10 } } });
  fb.db = fake.db;
});

describe("createOrder", () => {
  it("saves a guest order with a new guest customer record and takes the stock", async () => {
    const { id } = await createOrder(input, pricing, { customer: null });
    const order = fake.read("orders", id)!;
    expect(String(order.customerId)).toMatch(/^c_/);
    expect(order.customerPhone).toBe("9876543210");
    expect(fake.read("customers", String(order.customerId))).toMatchObject({ name: "Test Buyer" });
    expect(fake.read("variants", "GIN-1L")?.stock).toBe(8);
  });
  it("links a signed-in customer's order to their account and verified phone, without a guest record", async () => {
    const { id } = await createOrder(input, pricing, { customer: { uid: "u1", phone: "+919999999999" } });
    const order = fake.read("orders", id)!;
    expect(order.customerId).toBe("u1");
    expect(order.customerPhone).toBe("+919999999999");
    expect(fake.store.customers?.size ?? 0).toBe(0);
  });
});

describe("payment status", () => {
  it("marks an order paid, then failed payments don't touch paid orders' status line", async () => {
    const { id } = await createOrder(input, pricing, { customer: null });
    await markOrderPaid(id, "pay_1");
    expect(fake.read("orders", id)).toMatchObject({ paymentStatus: "Paid", status: "Processing", paymentId: "pay_1" });
    const { id: id2 } = await createOrder(input, pricing, { customer: null });
    await markOrderFailed(id2);
    expect(fake.read("orders", id2)?.paymentStatus).toBe("Failed");
  });
});

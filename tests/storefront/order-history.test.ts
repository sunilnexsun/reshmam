// My Account order history: reads the signed-in customer's own orders from Firestore (the rules allow
// customerId == their uid), newest first, and never hands an order's private access token to the page.
import { describe, expect, it, vi } from "vitest";

const calls: unknown[] = [];
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ where: [field, op, value] })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: [field, dir] })),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((...parts: unknown[]) => {
    calls.push(...parts);
    return { parts };
  }),
  getDocs: vi.fn(async () => ({
    docs: [
      {
        id: "o1",
        data: () => ({
          number: "RSH-20261124-ABC123",
          accessToken: "secret-token-abcdefghij",
          status: "Shipped",
          paymentMethod: "cod",
          paymentStatus: "Pending",
          subtotal: 600,
          shipping: 0,
          total: 600,
          createdAt: "2026-11-24T10:00:00.000Z",
          customerId: "u1",
          customerName: "Priya",
          items: [{ name: "Groundnut Oil", size: "1 L", qty: 2, total: 600 }],
        }),
      },
    ],
  })),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn(() => ({})), connectAuthEmulator: vi.fn() }));
vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []), getApp: vi.fn() }));

const { fetchCustomerOrders } = await import("@/app/(storefront)/_lib/customer-orders");

describe("fetchCustomerOrders", () => {
  it("queries the customer's own orders, newest first, at most 50, without access tokens", async () => {
    const orders = await fetchCustomerOrders("u1");
    expect(calls).toEqual([{ collection: "orders" }, { where: ["customerId", "==", "u1"] }, { orderBy: ["createdAt", "desc"] }, { limit: 50 }]);
    expect(orders).toEqual([
      expect.objectContaining({
        orderNumber: "RSH-20261124-ABC123",
        status: "Shipped",
        total: 600,
        customerName: "Priya",
        items: [{ product_name: "Groundnut Oil", variant_label: "1 L", quantity: 2, line_total_inr: 600 }],
      }),
    ]);
    expect(JSON.stringify(orders)).not.toContain("secret-token");
  });
});

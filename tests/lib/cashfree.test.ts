// Cashfree settings: the keyless "simulator" (every payment counts as paid) is for local testing only and
// must never run on a production server, where it would mark unpaid orders paid.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCashfreeOrder, getCashfreeConfig, verifyCashfreeOrder } from "@/lib/cashfree";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const noKeys = () => {
  vi.stubEnv("CASHFREE_APP_ID", "");
  vi.stubEnv("CASHFREE_SECRET_KEY", "");
};

describe("in production", () => {
  it("is not configured without keys, so checkout doesn't offer it", () => {
    vi.stubEnv("NODE_ENV", "production");
    noKeys();
    vi.stubEnv("CASHFREE_ENV", "");
    expect(getCashfreeConfig().isConfigured).toBe(false);
  });
  it("uses the live API when CASHFREE_ENV is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CASHFREE_ENV", "");
    expect(getCashfreeConfig().env).toBe("production");
  });
  it("never treats an order as paid without asking Cashfree", async () => {
    vi.stubEnv("NODE_ENV", "production");
    noKeys();
    vi.stubEnv("CASHFREE_ENV", "TEST");
    await expect(verifyCashfreeOrder("o1")).rejects.toThrow("CASHFREE_NOT_CONFIGURED");
    await expect(verifyCashfreeOrder("o1", "PAID")).rejects.toThrow("CASHFREE_NOT_CONFIGURED");
  });
  it("never creates a simulated payment session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    noKeys();
    vi.stubEnv("CASHFREE_ENV", "TEST");
    await expect(
      createCashfreeOrder({ orderId: "o1", orderNumber: "RSH-1", amount: 100, customer: { id: "c", name: "n", email: "e@x.com", phone: "9876543210" }, returnUrl: "https://x" }),
    ).rejects.toThrow();
  });
  it("still allows sandbox keys when CASHFREE_ENV=TEST is set on purpose (preview deploys)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CASHFREE_APP_ID", "TEST123");
    vi.stubEnv("CASHFREE_SECRET_KEY", "secret");
    vi.stubEnv("CASHFREE_ENV", "TEST");
    expect(getCashfreeConfig()).toMatchObject({ env: "sandbox", isConfigured: true });
  });
});

describe("in development", () => {
  it("keeps the simulator for local testing without keys", async () => {
    vi.stubEnv("NODE_ENV", "development");
    noKeys();
    vi.stubEnv("CASHFREE_ENV", "");
    expect(getCashfreeConfig()).toMatchObject({ env: "sandbox", isConfigured: true });
    expect((await verifyCashfreeOrder("o1")).isPaid).toBe(true);
  });
});

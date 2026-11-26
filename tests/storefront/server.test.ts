import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { newOrderNumber } from "@storefront/_lib/server/orders";

describe("newOrderNumber", () => {
  it("dates the order in India time, not the server's time zone", () => {
    // 20:00 UTC on 31 Oct is 01:30 on 1 Nov in India.
    expect(newOrderNumber(new Date("2026-10-31T20:00:00Z"))).toMatch(/^RSH-20261101-[0-9A-F]{6}$/);
    expect(newOrderNumber(new Date("2026-10-31T10:00:00Z"))).toMatch(/^RSH-20261031-/);
  });
});

describe("proxy", () => {
  afterEach(() => vi.unstubAllEnvs());
  const rewritesTo404 = (path: string) =>
    proxy(new NextRequest(`https://www.reshmam.com${path}`)).headers.get("x-middleware-rewrite")?.endsWith("/__not-found") ?? false;

  it("lets any product slug through to the page, which looks it up in Firestore", () => {
    expect(rewritesTo404("/products/gingelly-oil")).toBe(false);
    expect(rewritesTo404("/products/mwp4imchxuzgq")).toBe(false);
  });

  it("returns 404 for deeper/malformed product and blog paths while allowing dynamic slugs", () => {
    expect(rewritesTo404("/products/%E0")).toBe(true);
    expect(rewritesTo404("/products/gingelly-oil/extra")).toBe(true);
    expect(rewritesTo404("/blog/any-dynamic-slug")).toBe(false);
    expect(rewritesTo404("/blog/any-dynamic-slug/extra")).toBe(true);
    expect(rewritesTo404("/blog/%E0")).toBe(true);
  });

  it("always serves the admin panel (it has real sign-in now), even with the old DISABLE_ADMIN_DEMO=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DISABLE_ADMIN_DEMO", "1");
    expect(rewritesTo404("/admin")).toBe(false);
    expect(rewritesTo404("/admin/orders")).toBe(false);
  });
});

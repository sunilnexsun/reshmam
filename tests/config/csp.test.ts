// Customer phone sign-in runs Firebase's reCAPTCHA check before sending an SMS; the Content Security Policy
// must let its script, frame and calls through, or "Send OTP" fails on the live site.
import { afterEach, describe, expect, it, vi } from "vitest";

async function csp(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { default: config } = await import("../../next.config");
  const rules = await config.headers!();
  const value = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;
  return Object.fromEntries(value.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
}

afterEach(() => vi.unstubAllEnvs());

describe("Content Security Policy", () => {
  it("allows Firebase phone sign-in's reCAPTCHA", async () => {
    const p = await csp({ NODE_ENV: "production" });
    expect(p["script-src"]).toEqual(expect.arrayContaining(["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"]));
    expect(p["frame-src"]).toEqual(expect.arrayContaining(["https://www.google.com", "https://recaptcha.google.com", "https://*.firebaseapp.com"]));
    expect(p["connect-src"]).toEqual(expect.arrayContaining(["https://*.googleapis.com", "https://www.google.com"]));
  });
  it("never allows the local emulators in production", async () => {
    const p = await csp({ NODE_ENV: "production", NEXT_PUBLIC_FIREBASE_EMULATORS: "1" });
    expect(p["connect-src"].join(" ")).not.toContain("127.0.0.1");
  });
  it("allows the local emulators in development when switched on", async () => {
    const p = await csp({ NODE_ENV: "development", NEXT_PUBLIC_FIREBASE_EMULATORS: "1" });
    expect(p["connect-src"]).toEqual(expect.arrayContaining(["http://127.0.0.1:9099", "http://127.0.0.1:8080", "http://127.0.0.1:9199"]));
  });
});

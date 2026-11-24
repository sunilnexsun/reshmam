// The server's Firebase Admin helper: reading the caller's ID token and lazily initialising the Admin SDK.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  initializeApp: vi.fn((_opts: unknown, name: string) => ({ name })),
  getApps: vi.fn((): { name: string }[] => []),
  cert: vi.fn((c: unknown) => ({ cert: c })),
  verifyIdToken: vi.fn(),
}));
vi.mock("firebase-admin/app", () => ({ initializeApp: sdk.initializeApp, getApps: sdk.getApps, cert: sdk.cert }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: sdk.verifyIdToken }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({ kind: "firestore" }) }));

const SERVICE_ACCOUNT = JSON.stringify({ project_id: "reshmam-oil", client_email: "x@y.iam", private_key: "k" });
const req = (authorization?: string) =>
  new Request("https://www.reshmam.com/api", { headers: authorization ? { authorization } : {} });

let mod: typeof import("@/lib/firebase-admin");
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  sdk.getApps.mockReturnValue([]);
  mod = await import("@/lib/firebase-admin");
});
afterEach(() => vi.unstubAllEnvs());

describe("bearerToken", () => {
  it("reads the token from an Authorization: Bearer header", () => {
    expect(mod.bearerToken(req("Bearer abc"))).toBe("abc");
  });
  it("returns null without a usable bearer token", () => {
    expect(mod.bearerToken(req())).toBeNull();
    expect(mod.bearerToken(req("Basic x"))).toBeNull();
    expect(mod.bearerToken(req("Bearer "))).toBeNull();
  });
});

describe("verifyIdToken", () => {
  beforeEach(() => vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", SERVICE_ACCOUNT));

  it("returns the decoded token when Firebase accepts it", async () => {
    sdk.verifyIdToken.mockResolvedValue({ uid: "u1", phone_number: "+919999999999" });
    expect(await mod.verifyIdToken(req("Bearer good"))).toEqual({ uid: "u1", phone_number: "+919999999999" });
    expect(sdk.verifyIdToken).toHaveBeenCalledWith("good");
  });
  it("returns null, never throws, for an expired, forged or missing token", async () => {
    sdk.verifyIdToken.mockRejectedValue(new Error("auth/id-token-expired"));
    expect(await mod.verifyIdToken(req("Bearer old"))).toBeNull();
    expect(await mod.verifyIdToken(req())).toBeNull();
  });
  it("returns null when the Admin SDK isn't configured", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
    expect(await mod.verifyIdToken(req("Bearer good"))).toBeNull();
  });
});

describe("adminDb", () => {
  it("throws FirebaseAdminNotConfigured without the service account", () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
    expect(() => mod.adminDb()).toThrow(mod.FirebaseAdminNotConfigured);
  });
  it("initialises the admin app once from the service account", () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", SERVICE_ACCOUNT);
    mod.adminDb();
    mod.adminAuth();
    expect(sdk.initializeApp).toHaveBeenCalledTimes(1);
    expect(sdk.initializeApp.mock.calls[0][1]).toBe("reshmam-admin-server");
    expect(sdk.cert).toHaveBeenCalledWith(expect.objectContaining({ project_id: "reshmam-oil" }));
  });
});

describe("local emulators", () => {
  beforeEach(() => vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", ""));

  it("uses the emulators without credentials in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    expect(() => mod.adminDb()).not.toThrow();
    expect(sdk.initializeApp).toHaveBeenCalledWith({ projectId: "reshmam-oil" }, "reshmam-admin-server");
    expect(sdk.cert).not.toHaveBeenCalled();
  });

  it("never does so in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    expect(() => mod.adminDb()).toThrow(mod.FirebaseAdminNotConfigured);
  });
});

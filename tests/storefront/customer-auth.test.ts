// Customer accounts: the friendly copy for Firebase phone sign-in errors, and the profile document a new
// customer creates (only the fields the Firestore rules allow, with the verified phone number).
import { beforeEach, describe, expect, it, vi } from "vitest";

const setDoc = vi.fn(async () => {});
const updateDoc = vi.fn(async () => {});
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
  setDoc,
  updateDoc,
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn(() => ({})), onAuthStateChanged: vi.fn(), signOut: vi.fn() }));
vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []), getApp: vi.fn() }));

const { authErrorMessage, createProfile, updateProfile } = await import("@/app/(storefront)/_lib/customer-auth");

describe("authErrorMessage", () => {
  it.each([
    ["auth/invalid-verification-code", "That code isn't right. Check the SMS and try again."],
    ["auth/code-expired", "That code has expired. Tap Resend OTP for a new one."],
    ["auth/too-many-requests", "Too many attempts. Please wait a few minutes and try again."],
    ["auth/invalid-phone-number", "Enter a valid 10-digit mobile number."],
    ["auth/network-request-failed", "You seem to be offline. Check your connection and try again."],
    ["auth/something-else", "Something went wrong. Please try again."],
    ["", "Something went wrong. Please try again."],
  ])("%s", (code, message) => expect(authErrorMessage(code)).toBe(message));
});

describe("createProfile", () => {
  beforeEach(() => setDoc.mockClear());

  it("writes only the allowed fields, with the verified phone and source website", async () => {
    await createProfile({ uid: "u1", phoneNumber: "+919876543210" } as never, { name: "  Priya  ", email: "P@X.com " });
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = setDoc.mock.calls[0] as unknown as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe("customers/u1");
    expect(Object.keys(data).sort()).toEqual(["cart", "createdAt", "email", "id", "name", "phone", "source", "updatedAt", "wishlist"]);
    expect(data).toMatchObject({ id: "u1", name: "Priya", email: "p@x.com", phone: "+919876543210", source: "website", cart: [], wishlist: [] });
    expect(data.createdAt).toBe(data.updatedAt);
  });

  it("stores an empty email when none is given", async () => {
    await createProfile({ uid: "u2", phoneNumber: "+919876543211" } as never, { name: "Ravi" });
    const data = (setDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
    expect(data.email).toBe("");
  });

  it("refuses a user without a verified phone", async () => {
    await expect(createProfile({ uid: "u3", phoneNumber: null } as never, { name: "X" })).rejects.toThrow();
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe("updateProfile", () => {
  it("changes only name and email", async () => {
    await updateProfile("u1", { name: " New ", email: "" });
    const [ref, data] = updateDoc.mock.calls[0] as unknown as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe("customers/u1");
    expect(Object.keys(data).sort()).toEqual(["email", "name", "updatedAt"]);
    expect(data.name).toBe("New");
  });
});

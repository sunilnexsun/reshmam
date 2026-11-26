// Customer accounts: the friendly copy for Firebase sign-in errors, the profile a new account creates (only
// the fields the Firestore rules allow), and creating, logging in to and resetting a password account.
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
const deleteUser = vi.fn(async () => {});
const auth = {
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "new1", delete: deleteUser } })),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "u1" } })),
  sendPasswordResetEmail: vi.fn(async () => {}),
};
vi.mock("firebase/auth", () => ({ getAuth: vi.fn(() => ({})), onAuthStateChanged: vi.fn(), signOut: vi.fn(async () => {}), ...auth }));
vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []), getApp: vi.fn() }));

const { authErrorMessage, createAccount, createProfile, logIn, sendPasswordReset, updateProfile } = await import("@/app/(storefront)/_lib/customer-auth");

const WRONG = "That email or password isn't right.";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authErrorMessage", () => {
  it.each([
    ["auth/invalid-credential", WRONG],
    ["auth/wrong-password", WRONG],
    ["auth/user-not-found", WRONG],
    ["auth/email-already-in-use", "That email already has an account. Try logging in instead."],
    ["auth/weak-password", "Choose a stronger password of at least 8 characters."],
    ["auth/too-many-requests", "Too many attempts. Please wait a few minutes and try again."],
    ["auth/network-request-failed", "You seem to be offline. Check your connection and try again."],
    ["auth/something-else", "Something went wrong. Please try again."],
    ["", "Something went wrong. Please try again."],
  ])("%s", (code, message) => expect(authErrorMessage(code)).toBe(message));
});

describe("createProfile", () => {
  it("writes only the allowed fields: the name, the login email and the mobile in E.164", async () => {
    await createProfile("u1", { name: "  Ravi Kumar ", email: "ravi@example.com", phone: "9876543210" });
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = setDoc.mock.calls[0] as unknown as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe("customers/u1");
    expect(Object.keys(data).sort()).toEqual(["cart", "createdAt", "email", "id", "name", "phone", "source", "updatedAt", "wishlist"]);
    expect(data).toMatchObject({ id: "u1", name: "Ravi Kumar", email: "ravi@example.com", phone: "+919876543210", source: "website", cart: [], wishlist: [] });
    expect(data.createdAt).toBe(data.updatedAt);
  });
});

describe("createAccount", () => {
  it("signs up with the email and password, then saves the profile", async () => {
    await createAccount({ name: "Ravi", email: "ravi@example.com", phone: "9876543210", password: "secret123" });
    expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), "ravi@example.com", "secret123");
    expect((setDoc.mock.calls[0] as unknown as [{ path: string }])[0].path).toBe("customers/new1");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("removes the new account again if its profile can't be saved", async () => {
    setDoc.mockRejectedValueOnce(new Error("permission-denied"));
    await expect(createAccount({ name: "Ravi", email: "ravi@example.com", phone: "9876543210", password: "secret123" })).rejects.toThrow();
    expect(deleteUser).toHaveBeenCalledTimes(1);
  });
});

describe("logIn and sendPasswordReset", () => {
  it("logs in with the email and password", async () => {
    await logIn("ravi@example.com", "secret123");
    expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), "ravi@example.com", "secret123");
  });

  it("doesn't reveal whether an email has an account", async () => {
    auth.sendPasswordResetEmail.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "auth/user-not-found" }));
    await expect(sendPasswordReset("nobody@example.com")).resolves.toBeUndefined();
    auth.sendPasswordResetEmail.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "auth/network-request-failed" }));
    await expect(sendPasswordReset("ravi@example.com")).rejects.toThrow();
  });
});

describe("updateProfile", () => {
  it("changes only the name", async () => {
    await updateProfile("u1", { name: " New " });
    const [ref, data] = updateDoc.mock.calls[0] as unknown as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe("customers/u1");
    expect(Object.keys(data).sort()).toEqual(["name", "updatedAt"]);
    expect(data.name).toBe("New");
  });
});

// Firestore security rules: customers see only their own data and get no staff rights; each staff role gets
// exactly its permissions (same table as src/lib/staff-permissions.ts).
import { afterAll, beforeEach, describe, it } from "vitest";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { DEFAULT_ROLES } from "@/lib/staff-permissions";
import { allowed, clearFirestore, client, closeClients, denied, seedDb } from "./helpers";

const CUST1 = { uid: "cust1", email: "priya@example.com" };
const CUST2 = { uid: "cust2", email: "ravi@example.com" };
const ADMIN = { uid: "admin1" };
const MANAGER = { uid: "manager1" };
const STAFF = { uid: "staff1" };
const INACTIVE = { uid: "inactive1" };

const now = "2026-11-24T00:00:00.000Z";
const ownProfile = (uid: string, email: string, phone = "+919876543210") => ({
  id: uid,
  name: "Test Customer",
  email,
  phone,
  createdAt: now,
  updatedAt: now,
  source: "website",
});

beforeEach(async () => {
  await clearFirestore();
  const db = seedDb();
  await db.doc("configs/settings").set({ roles: DEFAULT_ROLES });
  await db.doc("adminUsers/admin1").set({ name: "A", email: "a@x.com", role: "Admin", status: "Active" });
  await db.doc("adminUsers/manager1").set({ name: "M", email: "m@x.com", role: "Manager", status: "Active" });
  await db.doc("adminUsers/staff1").set({ name: "S", email: "s@x.com", role: "Staff", status: "Active" });
  await db.doc("adminUsers/inactive1").set({ name: "I", email: "i@x.com", role: "Admin", status: "Inactive" });
  await db.doc("products/p1").set({ name: "Gingelly Oil", status: "Active" });
  await db.doc("variants/v1").set({ productId: "p1", size: "1 L", price: 600, mrp: 650, stock: 10, alertStock: 2 });
  await db.doc("coupons/c1").set({ code: "FESTIVE5" });
  await db.doc("customers/cust1").set(ownProfile("cust1", CUST1.email));
  await db.doc("customers/cust2").set(ownProfile("cust2", CUST2.email));
  await db.doc("orders/o1").set({ customerId: "cust1", total: 600, createdAt: now });
  await db.doc("orders/o2").set({ customerId: "cust2", total: 900, createdAt: now });
});
afterAll(closeClients);

describe("signed out", () => {
  it("can read the catalogue but not change it", async () => {
    const { db } = client(null);
    await allowed(getDoc(doc(db, "products/p1")));
    await allowed(getDoc(doc(db, "variants/v1")));
    await allowed(getDoc(doc(db, "coupons/c1")));
    await denied(setDoc(doc(db, "products/p2"), { name: "x" }));
  });
  it("can't read or create orders, or read admin configuration", async () => {
    const { db } = client(null);
    await denied(getDoc(doc(db, "orders/o1")));
    await denied(setDoc(doc(db, "orders/o3"), { customerId: "x", total: 1 }));
    await denied(getDoc(doc(db, "configs/settings")));
    await denied(getDoc(doc(db, "adminUsers/admin1")));
  });
});

describe("customer", () => {
  it("can create their own profile with the email they log in with", async () => {
    await seedDb().doc("customers/cust1").delete();
    await allowed(setDoc(doc(client(CUST1).db, "customers/cust1"), ownProfile("cust1", CUST1.email)));
  });
  it("can't claim another email, or create with no name, a bad mobile number, another uid or extra fields", async () => {
    await seedDb().doc("customers/cust1").delete();
    const { db } = client(CUST1);
    await denied(setDoc(doc(db, "customers/cust1"), ownProfile("cust1", "someone@example.com")));
    await denied(setDoc(doc(db, "customers/cust1"), { ...ownProfile("cust1", CUST1.email), name: "" }));
    await denied(setDoc(doc(db, "customers/cust1"), ownProfile("cust1", CUST1.email, "9876543210")));
    await denied(setDoc(doc(db, "customers/cust1"), ownProfile("cust1", CUST1.email, "+911234567890")));
    await denied(setDoc(doc(db, "customers/someoneelse"), ownProfile("someoneelse", CUST1.email)));
    await denied(setDoc(doc(db, "customers/cust1"), { ...ownProfile("cust1", CUST1.email), status: "VIP" }));
  });
  it("can update their name, cart and wishlist", async () => {
    const { db } = client(CUST1);
    await allowed(updateDoc(doc(db, "customers/cust1"), { name: "New Name", updatedAt: now }));
    await allowed(updateDoc(doc(db, "customers/cust1"), { cart: [{ variantId: "v1", quantity: 2 }], wishlist: ["p1"], updatedAt: now }));
  });
  it("can't give themselves staff fields or change their email or phone", async () => {
    const { db } = client(CUST1);
    await denied(updateDoc(doc(db, "customers/cust1"), { status: "Blocked" }));
    await denied(updateDoc(doc(db, "customers/cust1"), { role: "Admin" }));
    await denied(updateDoc(doc(db, "customers/cust1"), { notes: "x" }));
    await denied(updateDoc(doc(db, "customers/cust1"), { phone: "+919111111111" }));
    await denied(updateDoc(doc(db, "customers/cust1"), { email: "someone@example.com" }));
  });
  it("can't read or change another customer", async () => {
    const { db } = client(CUST1);
    await denied(getDoc(doc(db, "customers/cust2")));
    await denied(updateDoc(doc(db, "customers/cust2"), { name: "x" }));
  });
  it("can read only their own orders", async () => {
    const { db } = client(CUST1);
    await allowed(getDoc(doc(db, "orders/o1")));
    await allowed(getDocs(query(collection(db, "orders"), where("customerId", "==", "cust1"))));
    await denied(getDoc(doc(db, "orders/o2")));
    await denied(getDocs(collection(db, "orders")));
  });
  it("gets no staff rights", async () => {
    const { db } = client(CUST1);
    await denied(setDoc(doc(db, "products/p1"), { name: "hacked" }));
    await denied(updateDoc(doc(db, "variants/v1"), { price: 1 }));
    await denied(updateDoc(doc(db, "orders/o1"), { total: 1 }));
    await denied(setDoc(doc(db, "orders/o9"), { customerId: "cust1", total: 1 }));
    await denied(getDoc(doc(db, "adminUsers/admin1")));
    await denied(setDoc(doc(db, "adminUsers/cust1"), { role: "Admin", status: "Active" }));
    await denied(getDoc(doc(db, "configs/settings")));
  });
});

describe("Staff role", () => {
  it("manages orders and stock, but not prices, products or marketing", async () => {
    const { db } = client(STAFF);
    await allowed(updateDoc(doc(db, "orders/o1"), { status: "Shipped" }));
    await allowed(updateDoc(doc(db, "variants/v1"), { stock: 8, updatedAt: now }));
    await denied(updateDoc(doc(db, "variants/v1"), { price: 1 }));
    await denied(setDoc(doc(db, "products/p1"), { name: "x" }));
    await denied(setDoc(doc(db, "coupons/c2"), { code: "X" }));
    await denied(getDoc(doc(db, "configs/settings")));
    await denied(setDoc(doc(db, "configs/settings"), { roles: {} }));
  });
  it("can read their own staff record but not others'", async () => {
    const { db } = client(STAFF);
    await allowed(getDoc(doc(db, "adminUsers/staff1")));
    await denied(getDoc(doc(db, "adminUsers/admin1")));
  });
});

describe("Manager role", () => {
  it("manages products but can't change settings or staff", async () => {
    const { db } = client(MANAGER);
    await allowed(setDoc(doc(db, "products/p2"), { name: "New" }));
    await allowed(getDoc(doc(db, "configs/settings")));
    await denied(setDoc(doc(db, "configs/settings"), { roles: {} }));
    await denied(setDoc(doc(db, "adminUsers/new1"), { role: "Admin", status: "Active" }));
  });
});

describe("Admin role", () => {
  it("manages staff and settings", async () => {
    const { db } = client(ADMIN);
    await allowed(setDoc(doc(db, "adminUsers/new1"), { role: "Staff", status: "Active" }));
    await allowed(setDoc(doc(db, "configs/settings"), { roles: DEFAULT_ROLES }));
    await allowed(deleteDoc(doc(db, "coupons/c1")));
  });
  it("keeps full access even if its permissions are wiped from the settings", async () => {
    await seedDb().doc("configs/settings").set({ roles: { ...DEFAULT_ROLES, Admin: { permissions: {} } } });
    const { db } = client(ADMIN);
    await allowed(setDoc(doc(db, "products/p1"), { name: "Still works" }));
  });
});

describe("inactive staff", () => {
  it("is refused everything a signed-in stranger is refused", async () => {
    const { db } = client(INACTIVE);
    await denied(setDoc(doc(db, "products/p1"), { name: "x" }));
    await denied(getDoc(doc(db, "orders/o1")));
    await denied(getDoc(doc(db, "configs/settings")));
  });
});

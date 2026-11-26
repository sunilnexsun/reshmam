// Which staff role may read or write which Firestore data. The server's admin routes use this module; the
// Firestore rules encode the same table and their emulator tests check the same cases.
import { describe, expect, it } from "vitest";
import { DEFAULT_ROLES, canAccess, levelFor, type Roles } from "@/lib/staff-permissions";

const can = (role: string, col: string, op: "read" | "write", extra: Partial<Parameters<typeof canAccess>[0]> = {}, roles: Roles = DEFAULT_ROLES) =>
  canAccess({ role, roles, col, op, ...extra });

describe("DEFAULT_ROLES", () => {
  it("matches the admin panel's built-in roles", () => {
    expect(levelFor("Staff", DEFAULT_ROLES, "orders")).toBe("manage");
    expect(levelFor("Staff", DEFAULT_ROLES, "products")).toBe("view");
    expect(levelFor("Staff", DEFAULT_ROLES, "marketing")).toBe("none");
    expect(levelFor("Manager", DEFAULT_ROLES, "settings")).toBe("view");
    expect(levelFor("Manager", DEFAULT_ROLES, "products")).toBe("manage");
  });
});

describe("Staff role", () => {
  it("manages orders but not products", () => {
    expect(can("Staff", "orders", "write")).toBe(true);
    expect(can("Staff", "products", "write")).toBe(false);
    expect(can("Staff", "products", "read")).toBe(true);
  });
  it("can't see marketing data", () => {
    expect(can("Staff", "coupons", "read")).toBe(false);
    expect(can("Staff", "blogs", "read")).toBe(false);
    expect(can("Staff", "testimonials", "read")).toBe(false);
    expect(can("Manager", "blogs", "write")).toBe(true);
    expect(can("Manager", "testimonials", "write")).toBe(true);
  });
  it("can change a variant's stock but not its price", () => {
    expect(can("Staff", "variants", "write", { changedFields: ["stock", "updatedAt"] })).toBe(true);
    expect(can("Staff", "variants", "write", { changedFields: ["price"] })).toBe(false);
    expect(can("Staff", "variants", "write", { changedFields: ["stock", "price"] })).toBe(false);
  });
  it("can't create or delete variants (no changed-field list)", () => {
    expect(can("Staff", "variants", "write")).toBe(false);
  });
});

describe("Manager role", () => {
  it("manages products but can't change settings or staff", () => {
    expect(can("Manager", "products", "write")).toBe(true);
    expect(can("Manager", "configs", "write", { docId: "settings" })).toBe(false);
    expect(can("Manager", "adminUsers", "write")).toBe(false);
    expect(can("Manager", "configs", "read", { docId: "settings" })).toBe(true);
  });
  it("with prices: manage can change only price fields on a variant", () => {
    const roles: Roles = { Pricer: { permissions: { prices: "manage", products: "view" } } };
    expect(can("Pricer", "variants", "write", { changedFields: ["price", "mrp"] }, roles)).toBe(true);
    expect(can("Pricer", "variants", "write", { changedFields: ["stock"] }, roles)).toBe(false);
  });
});

describe("Admin role", () => {
  it("can do everything, including staff and settings", () => {
    expect(can("Admin", "adminUsers", "write")).toBe(true);
    expect(can("Admin", "configs", "write", { docId: "settings" })).toBe(true);
    expect(can("Admin", "variants", "write")).toBe(true);
  });
  it("keeps full access even if its permissions were wiped from the settings", () => {
    const wiped: Roles = { ...DEFAULT_ROLES, Admin: { permissions: {} } };
    expect(can("Admin", "products", "write", {}, wiped)).toBe(true);
    expect(levelFor("Admin", wiped, "settings")).toBe("manage");
  });
});

describe("special collections", () => {
  it("lets any staff member read their own staff record", () => {
    expect(can("Staff", "adminUsers", "read", { docId: "uid-1", selfUid: "uid-1" })).toBe(true);
    expect(can("Staff", "adminUsers", "read", { docId: "uid-2", selfUid: "uid-1" })).toBe(false);
  });
  it("lets any staff member add to the activity log, and dashboard viewers read it", () => {
    expect(can("Staff", "activities", "write", { writeKind: "create" })).toBe(true);
    expect(can("Staff", "activities", "read")).toBe(true);
    const noDash: Roles = { Packer: { permissions: { orders: "manage" } } };
    expect(can("Packer", "activities", "read", {}, noDash)).toBe(false);
  });
  it("never lets anyone change or delete an activity entry (it's the audit trail), matching the rules", () => {
    for (const role of ["Staff", "Admin"]) {
      expect(can(role, "activities", "write", { writeKind: "update", changedFields: ["message"] })).toBe(false);
      expect(can(role, "activities", "write", { writeKind: "delete" })).toBe(false);
      expect(can(role, "activities", "write")).toBe(false);
    }
  });
  it("maps configs documents to their own modules", () => {
    expect(can("Manager", "configs", "write", { docId: "whatsapp" })).toBe(false);
    expect(can("Staff", "configs", "read", { docId: "chatbot" })).toBe(false);
    expect(can("Admin", "configs", "write", { docId: "chatbot" })).toBe(true);
    expect(can("Admin", "configs", "write", { docId: "unknown" })).toBe(false);
  });
  it("refuses unknown roles and unknown collections", () => {
    expect(can("Intern", "orders", "read")).toBe(false);
    expect(can("Admin", "unknownCollection", "read")).toBe(false);
  });
});

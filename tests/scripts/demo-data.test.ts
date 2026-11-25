// Local demo (npm run dev:demo): what gets loaded into the Firebase emulators from the admin panel's sample
// data — the demo staff logins, every sample collection, and settings without any password in Firestore.
import { describe, expect, it } from "vitest";
import { DEMO_COLLECTIONS, demoDocuments } from "../../scripts/lib/demo-data.mjs";

const seed = {
  meta: { version: 5 },
  products: [{ id: "p1", name: "Oil" }],
  orders: [{ id: "o1" }, { id: "o2" }],
  readNotifications: [],
  whatsapp: { config: { on: true } },
  chatbot: { settings: {} },
  settings: {
    general: { storeName: "RESHMAM" },
    roles: { Manager: { permissions: { products: "manage" } } },
    users: [
      { id: "u_1", name: "Reshmam Admin", email: "Admin@Reshmam.com", password: "Admin@123", role: "Admin", branchId: "all", phone: "+91 1", status: "Active", lastLogin: "", avatar: "" },
      { id: "u_4", name: "Selvam R", email: "selvam@reshmam.com", password: "Staff@123", role: "Staff", branchId: "br_cf", phone: "", status: "Inactive", lastLogin: "", avatar: "" },
    ],
  },
};

describe("demoDocuments", () => {
  const d = demoDocuments(seed);

  it("loads each sample collection the admin panel syncs, and nothing else", () => {
    expect(d.collections.products).toEqual([{ id: "p1", name: "Oil" }]);
    expect(d.collections.orders).toHaveLength(2);
    expect(Object.keys(d.collections).every((c) => DEMO_COLLECTIONS.includes(c))).toBe(true);
    expect(d.collections).not.toHaveProperty("readNotifications");
    expect(d.collections).not.toHaveProperty("meta");
  });

  it("puts the demo staff in Firebase Auth with their old demo passwords, not in Firestore", () => {
    expect(d.staff).toEqual([
      { email: "admin@reshmam.com", password: "Admin@123", record: { name: "Reshmam Admin", email: "admin@reshmam.com", phone: "+91 1", role: "Admin", branchId: "all", status: "Active", avatar: "" } },
      { email: "selvam@reshmam.com", password: "Staff@123", record: { name: "Selvam R", email: "selvam@reshmam.com", phone: "", role: "Staff", branchId: "br_cf", status: "Inactive", avatar: "" } },
    ]);
    expect(JSON.stringify(d.staff.map((s) => s.record))).not.toContain("password");
  });

  it("writes the settings with the roles but without the staff list or any password", () => {
    expect(d.configs.settings).toEqual({ general: { storeName: "RESHMAM" }, roles: { Manager: { permissions: { products: "manage" } } } });
    expect(d.configs.whatsapp).toEqual({ config: { on: true } });
    expect(JSON.stringify(d.configs)).not.toContain("Admin@123");
  });
});

// The one-time move of staff to Firebase Auth: who keeps their password, who must reset it, and making sure
// no password survives anywhere in Firestore.
import { describe, expect, it } from "vitest";
import { SEED_PASSWORDS, planMigration } from "../../scripts/lib/admin-migration.mjs";

const users = [
  { id: "u_1", name: "Reshmam Admin", email: "Admin@Reshmam.com", password: "Admin@123", role: "Admin", status: "Active" },
  { id: "u_2", name: "Owner", email: "owner@reshmam.com", password: "Str0ng&Private!", role: "Admin", status: "Active" },
  { id: "u_3", name: "No Password", email: "np@reshmam.com", role: "Staff", status: "Active" },
  { id: "u_4", name: "Old", email: "old@reshmam.com", password: "Staff@123", role: "Staff", status: "Inactive" },
];
const settings = {
  general: { storeName: "RESHMAM" },
  users: [{ id: "u_1", password: "Admin@123" }],
  nested: { deeper: [{ password: "x", keep: 1 }] },
};

describe("planMigration", () => {
  const plan = planMigration(users, settings);

  it("knows the seed passwords", () => {
    expect(SEED_PASSWORDS).toEqual(["Admin@123", "Manager@123", "Staff@123"]);
  });
  it("never carries a seed password over; those staff must reset", () => {
    const admin = plan.users.find((u) => u.oldId === "u_1")!;
    expect(admin.keepPassword).toBe(false);
    expect(plan.mustReset).toContain("admin@reshmam.com");
  });
  it("keeps a staff member's own password", () => {
    const owner = plan.users.find((u) => u.oldId === "u_2")!;
    expect(owner.keepPassword).toBe(true);
    expect(plan.mustReset).not.toContain("owner@reshmam.com");
  });
  it("makes staff with no password reset too", () => {
    expect(plan.users.find((u) => u.oldId === "u_3")!.keepPassword).toBe(false);
    expect(plan.mustReset).toContain("np@reshmam.com");
  });
  it("lowercases emails and keeps role and status", () => {
    expect(plan.users[0]).toMatchObject({ email: "admin@reshmam.com", record: { role: "Admin", status: "Active" } });
    expect(plan.users.find((u) => u.oldId === "u_4")!.record.status).toBe("Inactive");
  });
  it("never puts a password in a staff record", () => {
    expect(JSON.stringify(plan.users.map((u) => u.record))).not.toContain("password");
  });
  it("removes every password from the settings, at any depth, and drops the users copy", () => {
    expect(plan.scrubbedSettings.users).toBeUndefined();
    expect(JSON.stringify(plan.scrubbedSettings)).not.toContain("password");
    expect(plan.scrubbedSettings.nested.deeper[0].keep).toBe(1);
    expect(plan.scrubbedSettings.general.storeName).toBe("RESHMAM");
  });
  it("handles missing settings", () => {
    expect(planMigration(users, null).scrubbedSettings).toBeNull();
  });
  it("skips records without an email", () => {
    const p = planMigration([{ id: "x", name: "No email", role: "Staff", status: "Active" }], null);
    expect(p.users).toHaveLength(0);
    expect(p.skipped).toEqual(["x"]);
  });
  it("treats staff already migrated (a re-run) as done, not as needing a reset", () => {
    const p = planMigration([{ id: "uid9", email: "done@x.com", role: "Admin", status: "Active", migratedAt: "2026-11-24" }], null);
    expect(p.users[0]).toMatchObject({ alreadyMigrated: true });
    expect(p.mustReset).toEqual([]);
  });
});

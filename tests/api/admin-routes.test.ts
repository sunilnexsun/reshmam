// The admin API routes: only signed-in, active staff get in, and each request is limited to what the staff
// member's role allows (src/lib/staff-permissions.ts). The Admin SDK is faked in memory.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ROLES } from "@/lib/staff-permissions";
import { fakeAdminDb } from "../support/fake-admin-db";

const tokens: Record<string, { uid: string }> = {
  admin: { uid: "admin1" },
  manager: { uid: "manager1" },
  staff: { uid: "staff1" },
  inactive: { uid: "inactive1" },
  customer: { uid: "cust1" },
};
const fb = vi.hoisted(() => ({
  db: null as unknown,
  createUser: vi.fn(async (u: { email: string }) => ({ uid: `new-${u.email}` })),
  updateUser: vi.fn(async () => ({})),
  deleteUser: vi.fn(async () => {}),
  revokeRefreshTokens: vi.fn(async () => {}),
  generatePasswordResetLink: vi.fn(async (email: string) => `https://reset.example/${email}`),
}));
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: () => fb.db,
  adminAuth: () => fb,
  verifyIdToken: async (req: Request) => {
    const t = req.headers.get("authorization")?.replace(/^Bearer /, "");
    return t && tokens[t] ? tokens[t] : null;
  },
}));

let fake: ReturnType<typeof fakeAdminDb>;
beforeEach(() => {
  vi.clearAllMocks();
  fake = fakeAdminDb({
    adminUsers: {
      admin1: { name: "A", email: "a@x.com", role: "Admin", status: "Active" },
      manager1: { name: "M", email: "m@x.com", role: "Manager", status: "Active" },
      staff1: { name: "S", email: "s@x.com", role: "Staff", status: "Active" },
      inactive1: { name: "I", email: "i@x.com", role: "Admin", status: "Inactive" },
      legacy: { name: "L", email: "l@x.com", role: "Staff", status: "Active", password: "Staff@123" },
    },
    configs: { settings: { roles: DEFAULT_ROLES, users: [{ id: "legacy", password: "Staff@123" }] } },
    products: { p1: { name: "Gingelly Oil" } },
    variants: { v1: { productId: "p1", price: 600, mrp: 650, stock: 10 } },
    coupons: { c1: { code: "FESTIVE5" } },
    orders: { o1: { total: 600, status: "Pending" } },
  });
  fb.db = fake.db;
});

const { GET: getData, POST: postData } = await import("@/app/api/admin/firestore/route");
const { GET: getMe } = await import("@/app/api/admin/me/route");
const { GET: getAuth, POST: postAuth } = await import("@/app/api/admin/auth/route");
const staffRoute = await import("@/app/api/admin/staff/route");

const call = (token: string | null, init: RequestInit = {}, url = "https://www.reshmam.com/api/admin") =>
  new Request(url, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
const post = (token: string | null, body: unknown, url?: string) => call(token, { method: "POST", body: JSON.stringify(body) }, url);

describe("who gets in", () => {
  it("refuses requests without a valid token (401)", async () => {
    expect((await getData(call(null))).status).toBe(401);
    expect((await postData(post(null, { action: "save", col: "products", id: "p1", data: {} }))).status).toBe(401);
    expect((await getMe(call(null))).status).toBe(401);
    expect((await staffRoute.POST(post(null, {}))).status).toBe(401);
  });
  it("refuses customers and inactive staff (403)", async () => {
    expect((await getData(call("customer"))).status).toBe(403);
    expect((await getData(call("inactive"))).status).toBe(403);
    expect((await getMe(call("inactive"))).status).toBe(403);
  });
  it("/me returns the caller's staff record without a password", async () => {
    const res = await getMe(call("staff"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, user: { id: "staff1", role: "Staff" } });
  });
});

describe("GET /api/admin/firestore", () => {
  it("returns only what the role may see, and never a password", async () => {
    const data = await (await getData(call("staff"))).json();
    expect(data.data.products).toHaveLength(1);
    expect(data.data.coupons).toBeUndefined();
    expect(data.configs.settings).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("password");
  });
  it("gives an Admin everything, still without passwords", async () => {
    const data = await (await getData(call("admin"))).json();
    expect(data.data.adminUsers.map((u: { id: string }) => u.id)).toContain("legacy");
    expect(data.configs.settings.roles).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain("password");
  });
});

describe("POST /api/admin/firestore", () => {
  it("lets Staff update stock on a whole-record save, but not the price", async () => {
    const ok = await postData(post("staff", { action: "save", col: "variants", id: "v1", data: { productId: "p1", price: 600, mrp: 650, stock: 7 } }));
    expect(ok.status).toBe(200);
    expect(fake.read("variants", "v1")?.stock).toBe(7);
    const no = await postData(post("staff", { action: "save", col: "variants", id: "v1", data: { productId: "p1", price: 1, mrp: 650, stock: 7 } }));
    expect(no.status).toBe(403);
    expect(fake.read("variants", "v1")?.price).toBe(600);
  });
  it("refuses a whole batch, writing nothing, when any operation isn't allowed", async () => {
    const res = await postData(
      post("staff", {
        action: "batch",
        operations: [
          { type: "set", col: "orders", id: "o1", data: { status: "Shipped" } },
          { type: "set", col: "products", id: "p1", data: { name: "Changed" } },
        ],
      }),
    );
    expect(res.status).toBe(403);
    expect(fake.read("orders", "o1")?.status).toBe("Pending");
    expect(fake.read("products", "p1")?.name).toBe("Gingelly Oil");
  });
  it("never saves staff records here (they go through /api/admin/staff)", async () => {
    const res = await postData(post("admin", { action: "save", col: "adminUsers", id: "x", data: { role: "Admin" } }));
    expect(res.status).toBe(403);
    expect(fake.read("adminUsers", "x")).toBeUndefined();
  });
  it("strips passwords from saved settings", async () => {
    const res = await postData(post("admin", { action: "save", col: "configs", id: "settings", data: { roles: DEFAULT_ROLES, users: [{ id: "u", password: "secret" }] } }));
    expect(res.status).toBe(200);
    expect(JSON.stringify(fake.read("configs", "settings"))).not.toContain("secret");
  });
});

describe("/api/admin/auth", () => {
  it("no longer checks passwords (410)", async () => {
    expect((await postAuth()).status).toBe(410);
  });
  it("lists staff only to staff allowed to view settings, without passwords", async () => {
    expect((await getAuth(call("staff"))).status).toBe(403);
    const res = await getAuth(call("manager"));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain("password");
  });
});

describe("/api/admin/staff", () => {
  const newUser = { name: "New", email: "new@x.com", role: "Staff", status: "Active" };
  it("only the Admin role can create staff", async () => {
    expect((await staffRoute.POST(post("manager", newUser))).status).toBe(403);
  });
  it("creates a Firebase Auth user and staff record, with a reset link instead of a password", async () => {
    const res = await staffRoute.POST(post("admin", newUser));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resetLink).toBe("https://reset.example/new@x.com");
    expect(fb.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "new@x.com", displayName: "New" }));
    expect(fake.read("adminUsers", "new-new@x.com")).toMatchObject({ role: "Staff", status: "Active" });
    expect(JSON.stringify(fake.read("adminUsers", "new-new@x.com"))).not.toContain("password");
  });
  it("disabling a staff member also disables their sign-in and ends their sessions", async () => {
    const res = await staffRoute.PATCH(call("admin", { method: "PATCH", body: JSON.stringify({ uid: "staff1", status: "Inactive" }) }));
    expect(res.status).toBe(200);
    expect(fake.read("adminUsers", "staff1")?.status).toBe("Inactive");
    expect(fb.updateUser).toHaveBeenCalledWith("staff1", expect.objectContaining({ disabled: true }));
    expect(fb.revokeRefreshTokens).toHaveBeenCalledWith("staff1");
  });
  it("deletes both the sign-in and the staff record", async () => {
    const res = await staffRoute.DELETE(call("admin", { method: "DELETE" }, "https://www.reshmam.com/api/admin/staff?uid=staff1"));
    expect(res.status).toBe(200);
    expect(fb.deleteUser).toHaveBeenCalledWith("staff1");
    expect(fake.read("adminUsers", "staff1")).toBeUndefined();
  });
});

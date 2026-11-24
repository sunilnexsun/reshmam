// Storage rules: anyone can view images; only staff allowed to manage products or marketing can upload.
import { afterAll, beforeAll, describe, it } from "vitest";
import { ref, uploadString } from "firebase/storage";
import { DEFAULT_ROLES } from "@/lib/staff-permissions";
import { allowed, clearFirestore, client, closeClients, denied, seedDb } from "./helpers";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const upload = (storage: ReturnType<typeof client>["storage"], path: string) =>
  uploadString(ref(storage, path), PNG_DATA_URL, "data_url", { contentType: "image/png" });

beforeAll(async () => {
  await clearFirestore();
  const db = seedDb();
  await db.doc("configs/settings").set({ roles: DEFAULT_ROLES });
  await db.doc("adminUsers/manager1").set({ role: "Manager", status: "Active" });
  await db.doc("adminUsers/staff1").set({ role: "Staff", status: "Active" });
});
afterAll(closeClients);

describe("product images", () => {
  it("a Manager (products: manage) can upload", async () => {
    await allowed(upload(client({ uid: "manager1" }).storage, "products/test.png"));
  });
  it("Staff (products: view) and customers can't", async () => {
    await denied(upload(client({ uid: "staff1" }).storage, "products/test2.png"));
    await denied(upload(client({ uid: "cust1", phone: "+919876543210" }).storage, "products/test3.png"));
    await denied(upload(client(null).storage, "products/test4.png"));
  });
});

describe("banners", () => {
  it("only marketing managers can upload", async () => {
    await allowed(upload(client({ uid: "manager1" }).storage, "banners/b.png"));
    await denied(upload(client({ uid: "staff1" }).storage, "banners/b2.png"));
  });
});

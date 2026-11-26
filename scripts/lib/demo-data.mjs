// Pure preparation for scripts/seed-demo.mjs: turns the admin panel's sample data into what the local Firebase
// emulators hold — staff in Firebase Auth (with the old demo passwords, local only), the sample collections,
// and the settings without the staff list or any password.
import { withoutPasswords } from "./admin-migration.mjs";

/** The collections the admin panel reads from Firestore (src/app/admin/_lib/store.js), minus adminUsers. */
export const DEMO_COLLECTIONS = [
  "branches", "products", "variants", "categories", "brands", "customers", "orders",
  "stockMovements", "priceHistory", "coupons", "campaigns", "banners", "blogs", "testimonials", "activities",
];
const CONFIGS = ["whatsapp", "chatbot", "settings"];
const STAFF_FIELDS = ["name", "email", "phone", "role", "branchId", "status", "avatar"];

/**
 * @param {any} seed  the admin panel's buildSeed() output
 * @returns {{ collections: Record<string, any[]>, configs: Record<string, any>, staff: { email: string, password: string, record: Record<string, any> }[] }}
 */
export function demoDocuments(seed) {
  /** @type {Record<string, any[]>} */
  const collections = {};
  for (const col of DEMO_COLLECTIONS) if (Array.isArray(seed[col])) collections[col] = seed[col];

  /** @type {Record<string, any>} */
  const configs = {};
  for (const key of CONFIGS) {
    if (!seed[key] || typeof seed[key] !== "object") continue;
    const { users: _users, ...rest } = seed[key];
    configs[key] = withoutPasswords(key === "settings" ? rest : seed[key]);
  }

  const staff = (seed.settings?.users ?? [])
    .filter((/** @type {any} */ u) => u.email && u.password)
    .map((/** @type {any} */ u) => {
      const email = String(u.email).trim().toLowerCase();
      const record = Object.fromEntries(STAFF_FIELDS.map((f) => [f, f === "email" ? email : (u[f] ?? "")]));
      return { email, password: String(u.password), record };
    });

  return { collections, configs, staff };
}

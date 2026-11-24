/**
 * Which staff role may read or write which Firestore data.
 *
 * Roles live in configs/settings.roles, as the admin panel defines them: each role has a level
 * ("none" | "view" | "manage") per module. The server's admin routes check requests with canAccess();
 * firestore.rules encodes the same table, and both have tests over the same cases so they can't drift.
 *
 * Pure module (no Firebase imports): safe to use from routes, scripts and tests.
 */

export type Level = "none" | "view" | "manage";

export const MODULES = [
  "dashboard",
  "products",
  "categories",
  "brands",
  "orders",
  "prices",
  "inventory",
  "branches",
  "customers",
  "marketing",
  "whatsapp",
  "chatbot",
  "reports",
  "settings",
] as const;
export type Module = (typeof MODULES)[number];

export type Roles = Record<string, { description?: string; permissions: Partial<Record<Module, Level>> }>;

const all = (level: Level) => Object.fromEntries(MODULES.map((m) => [m, level])) as Record<Module, Level>;

/** The admin panel's built-in roles (src/app/admin/_lib/seed.js), used when configs/settings has none. */
export const DEFAULT_ROLES: Roles = {
  Admin: { description: "Full access to every module and setting", permissions: all("manage") },
  Manager: {
    description: "Runs day-to-day operations; cannot change system settings",
    permissions: { ...all("manage"), settings: "view", whatsapp: "view", chatbot: "view" },
  },
  Staff: {
    description: "Handles orders and stock; read-only elsewhere",
    permissions: {
      ...all("view"),
      orders: "manage",
      inventory: "manage",
      marketing: "none",
      whatsapp: "none",
      chatbot: "none",
      settings: "none",
      reports: "none",
    },
  },
};

/** The Admin role can never be locked out, whatever configs/settings says. */
export const ADMIN_ROLE = "Admin";

export function levelFor(role: string, roles: Roles, module: Module): Level {
  if (role === ADMIN_ROLE) return "manage";
  return roles[role]?.permissions?.[module] ?? "none";
}

const allows = (level: Level, op: "read" | "write") => (op === "read" ? level !== "none" : level === "manage");

/** Collections that map straight to one module. */
const COLLECTION_MODULE: Record<string, Module> = {
  products: "products",
  categories: "categories",
  brands: "brands",
  priceHistory: "prices",
  stockMovements: "inventory",
  branches: "branches",
  orders: "orders",
  customers: "customers",
  coupons: "marketing",
  campaigns: "marketing",
  banners: "marketing",
};

/** Fields each module may change on a variant (products: manage may change any field). */
export const VARIANT_FIELDS: Partial<Record<Module, readonly string[]>> = {
  prices: ["price", "mrp", "updatedAt"],
  inventory: ["stock", "alertStock", "updatedAt"],
};

export type AccessRequest = {
  role: string;
  roles: Roles;
  col: string;
  docId?: string;
  op: "read" | "write";
  /** For updates: the fields being written. Omitted for creates and deletes. */
  changedFields?: string[];
  /** For writes: whether the document is new, already exists, or is being deleted. */
  writeKind?: "create" | "update" | "delete";
  /** The caller's uid, so a staff member can read their own adminUsers record. */
  selfUid?: string;
};

export function canAccess({ role, roles, col, docId, op, changedFields, writeKind, selfUid }: AccessRequest): boolean {
  const lvl = (m: Module) => levelFor(role, roles, m);
  const known = role === ADMIN_ROLE || Boolean(roles[role]);
  if (!known) return false;

  const mapped = COLLECTION_MODULE[col];
  if (mapped) return allows(lvl(mapped), op);

  switch (col) {
    case "variants": {
      if (op === "read") return allows(lvl("products"), "read") || allows(lvl("prices"), "read") || allows(lvl("inventory"), "read");
      if (lvl("products") === "manage") return true;
      if (!changedFields?.length) return false; // creating or deleting a variant needs products: manage
      return (["prices", "inventory"] as const).some(
        (m) => lvl(m) === "manage" && changedFields.every((f) => VARIANT_FIELDS[m]!.includes(f)),
      );
    }
    case "configs": {
      if (docId === "settings") return op === "read" ? allows(lvl("settings"), "read") : role === ADMIN_ROLE;
      if (docId === "whatsapp") return allows(lvl("whatsapp"), op);
      if (docId === "chatbot") return allows(lvl("chatbot"), op);
      return false;
    }
    case "adminUsers": {
      if (op === "write") return role === ADMIN_ROLE;
      return (selfUid !== undefined && docId === selfUid) || allows(lvl("settings"), "read");
    }
    case "activities":
      // The audit trail: any staff member adds entries; nobody changes or deletes them (as in the rules).
      return op === "write" ? writeKind === "create" : allows(lvl("dashboard"), "read");
    default:
      return false;
  }
}

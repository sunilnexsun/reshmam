import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireStaff, withoutPasswords } from "@/lib/staff-auth";
import { canAccess } from "@/lib/staff-permissions";

/**
 * The admin panel's data API. Only signed-in, active staff get in, and every read and write is limited to
 * what their role allows (same table as firestore.rules). Uses the Admin SDK, so these checks are the only
 * protection: keep them in step with src/lib/staff-permissions.ts.
 *
 * Staff records (adminUsers) are never written here: they go through /api/admin/staff, which also manages
 * the Firebase Auth account. Passwords are never returned or stored.
 */

const COLLECTIONS = [
  "adminUsers",
  "categories",
  "brands",
  "branches",
  "products",
  "variants",
  "customers",
  "orders",
  "stockMovements",
  "priceHistory",
  "coupons",
  "campaigns",
  "banners",
  "activities",
] as const;
const CONFIG_KEYS = ["settings", "whatsapp", "chatbot"];

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

type Data = Record<string, unknown>;

/** Firestore rejects undefined; turn it into null and Dates into ISO strings. */
function sanitize(val: unknown): unknown {
  if (val === undefined) return null;
  if (val === null || typeof val !== "object") return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(sanitize);
  const clean: Data = {};
  for (const [k, v] of Object.entries(val)) if (v !== undefined) clean[k] = sanitize(v);
  return clean;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Fields whose values differ from the stored document (what the rules' diff() sees). */
function changedFields(stored: Data | undefined, incoming: Data, merge: boolean): string[] {
  const before = stored ?? {};
  const keys = new Set([...Object.keys(incoming), ...(merge ? [] : Object.keys(before))]);
  return [...keys].filter((k) => k !== "id" && k !== "updatedAt" && !same(before[k], incoming[k]));
}

export async function GET(req: Request) {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;
  const may = (col: string, docId?: string) =>
    canAccess({ role: ctx.staff.role, roles: ctx.roles, col, docId, op: "read", selfUid: ctx.uid });

  try {
    const db = adminDb();
    const data: Record<string, Data[]> = {};
    const configs: Record<string, Data> = {};
    await Promise.all([
      ...COLLECTIONS.map(async (col) => {
        if (col === "adminUsers") {
          const snap = await db.collection(col).get();
          const rows = snap.docs.filter((d) => may(col, d.id)).map((d) => ({ ...(d.data() as Data), id: d.id }));
          if (rows.length) data[col] = rows;
          return;
        }
        if (!may(col)) return;
        const snap = await db.collection(col).get();
        data[col] = snap.docs.map((d) => ({ ...(d.data() as Data), id: d.id }));
      }),
      (async () => {
        const snap = await db.collection("configs").get();
        for (const d of snap.docs) {
          if (!CONFIG_KEYS.includes(d.id) || !may("configs", d.id)) continue;
          const { id: _id, updatedAt: _u, ...rest } = d.data() as Data;
          configs[d.id] = rest;
        }
      })(),
    ]);
    return NextResponse.json(withoutPasswords({ ok: true, data, configs }), { headers: NO_STORE });
  } catch (err: unknown) {
    console.error("[admin/firestore] read failed", err);
    return NextResponse.json({ ok: false, error: "Could not load admin data." }, { status: 500 });
  }
}

type Op = { type: "set" | "delete"; col: string; id: string; data?: Data; merge?: boolean };

export async function POST(req: Request) {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;

  const body = (await req.json().catch(() => null)) as
    | { action?: string; col?: string; id?: string; data?: Data; merge?: boolean; operations?: Op[] }
    | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

  const ops: Op[] =
    body.action === "batch" && Array.isArray(body.operations)
      ? body.operations.filter((o) => o?.col && o?.id).map((o) => ({ ...o, col: String(o.col), id: String(o.id) }))
      : body.col && body.id
        ? [{ type: body.action === "delete" ? "delete" : "set", col: String(body.col), id: String(body.id), data: body.data, merge: body.merge }]
        : [];
  if (!ops.length) return NextResponse.json({ ok: false, error: "Missing col or id" }, { status: 400 });

  try {
    const db = adminDb();
    // Check every operation before writing anything, so a refused batch leaves no partial writes.
    for (const op of ops) {
      if (op.col === "adminUsers") {
        return NextResponse.json({ ok: false, error: "Staff accounts are managed through /api/admin/staff." }, { status: 403 });
      }
      let fields: string[] | undefined;
      if (op.type !== "delete") {
        const stored = await db.collection(op.col).doc(op.id).get();
        // An update lists its changed fields; a create (no stored document) is checked like a delete.
        if (stored.exists) fields = changedFields(stored.data() as Data, op.data ?? {}, op.merge !== false);
        if (stored.exists && fields!.length === 0) continue;
      }
      const ok = canAccess({ role: ctx.staff.role, roles: ctx.roles, col: op.col, docId: op.id, op: "write", changedFields: fields });
      if (!ok) {
        return NextResponse.json({ ok: false, error: `Your role can't change ${op.col}.` }, { status: 403 });
      }
    }

    const batch = db.batch();
    const now = new Date().toISOString();
    for (const op of ops) {
      const ref = db.collection(op.col).doc(op.id);
      if (op.type === "delete") batch.delete(ref);
      else batch.set(ref, withoutPasswords(sanitize({ ...(op.data ?? {}), id: op.id, updatedAt: now })) as Data, { merge: op.merge !== false });
    }
    await batch.commit();
    return NextResponse.json({ ok: true, count: ops.length });
  } catch (err: unknown) {
    console.error("[admin/firestore] write failed", err);
    return NextResponse.json({ ok: false, error: "Could not save." }, { status: 500 });
  }
}

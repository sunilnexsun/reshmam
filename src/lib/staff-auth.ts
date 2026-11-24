import "server-only";
import { NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { DEFAULT_ROLES, type Roles } from "@/lib/staff-permissions";

/**
 * Checks that a request to /api/admin/* comes from signed-in, active staff, and loads their role table.
 * Returns the staff context, or the error response to send back (401 not signed in, 403 not active staff).
 */

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  branchId?: string;
  phone?: string;
  [key: string]: unknown;
};

export type StaffContext = { uid: string; staff: StaffRecord; roles: Roles };

const json = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/** Removes every `password` key, at any depth. */
export function withoutPasswords<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutPasswords) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== "password")
        .map(([k, v]) => [k, withoutPasswords(v)]),
    ) as T;
  }
  return value;
}

export async function loadRoles(): Promise<Roles> {
  const snap = await adminDb().collection("configs").doc("settings").get();
  const roles = (snap.data()?.roles as Roles | undefined) ?? undefined;
  return roles && Object.keys(roles).length ? roles : DEFAULT_ROLES;
}

export async function requireStaff(req: Request): Promise<StaffContext | Response> {
  const token = await verifyIdToken(req);
  if (!token) return json(401, "Please sign in.");
  const snap = await adminDb().collection("adminUsers").doc(token.uid).get();
  const data = snap.data();
  if (!snap.exists || !data || data.status !== "Active") return json(403, "This account is not staff or is inactive.");
  const staff = withoutPasswords({ ...data, id: token.uid }) as StaffRecord;
  return { uid: token.uid, staff, roles: await loadRoles() };
}

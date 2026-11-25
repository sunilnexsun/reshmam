import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireStaff, withoutPasswords } from "@/lib/staff-auth";
import { canAccess } from "@/lib/staff-permissions";

/**
 * Staff sign in with Firebase Auth (email and password) in the browser; passwords are never checked or
 * stored here. GET lists staff for those allowed to view settings.
 */

const ROLE_ORDER: Record<string, number> = { Admin: 1, Manager: 2, Staff: 3 };

export async function GET(req: Request) {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;
  if (!canAccess({ role: ctx.staff.role, roles: ctx.roles, col: "adminUsers", op: "read" })) {
    return NextResponse.json({ ok: false, error: "Your role can't view staff." }, { status: 403 });
  }
  const snap = await adminDb().collection("adminUsers").get();
  const users = snap.docs
    .map((d: any) => withoutPasswords({ ...(d.data() as Record<string, unknown>), id: d.id }) as { id: string; role?: string; name?: string })
    .sort((a: any, b: any) => (ROLE_ORDER[a.role ?? ""] ?? 99) - (ROLE_ORDER[b.role ?? ""] ?? 99) || (a.name ?? "").localeCompare(b.name ?? ""));
  return NextResponse.json({ ok: true, users }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "Sign in with Firebase." }, { status: 410 });
}

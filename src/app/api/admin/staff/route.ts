import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireStaff, type StaffContext } from "@/lib/staff-auth";
import { ADMIN_ROLE } from "@/lib/staff-permissions";

/**
 * Staff accounts (Admin role only): each staff member is a Firebase Auth email/password user plus a record
 * at adminUsers/{uid}. New staff get a password-reset link to set their own password; no password is ever
 * stored in Firestore.
 */

const fields = {
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(20).optional(),
  role: z.string().trim().min(1).max(40),
  branchId: z.string().trim().max(40).optional(),
  status: z.enum(["Active", "Inactive"]),
  // Profile photo: a Storage URL or a small data URL from the admin's image uploader.
  avatar: z.string().max(500_000).optional(),
};
const createSchema = z.object({ ...fields, email: z.string().trim().toLowerCase().email() });
const updateSchema = z.object({ uid: z.string().min(1), ...fields }).partial({ name: true, role: true, status: true });

async function requireAdminRole(req: Request): Promise<StaffContext | Response> {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;
  if (ctx.staff.role !== ADMIN_ROLE) {
    return NextResponse.json({ ok: false, error: "Only the Admin role can manage staff." }, { status: 403 });
  }
  return ctx;
}

const bad = (error: string) => NextResponse.json({ ok: false, error }, { status: 400 });

export async function POST(req: Request) {
  const ctx = await requireAdminRole(req);
  if (ctx instanceof Response) return ctx;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Please check the staff details.");
  const { email, name, phone, role, branchId, status } = parsed.data;

  const user = await adminAuth().createUser({
    email,
    displayName: name,
    // A long random password nobody knows; the new staff member sets their own through the reset link.
    password: randomBytes(24).toString("base64url"),
    disabled: status !== "Active",
  });
  const now = new Date().toISOString();
  const record = { id: user.uid, name, email, phone: phone ?? "", role, branchId: branchId ?? "all", status, createdAt: now, updatedAt: now };
  await adminDb().collection("adminUsers").doc(user.uid).set(record);
  const resetLink = await adminAuth().generatePasswordResetLink(email);
  return NextResponse.json({ ok: true, user: record, resetLink });
}

/** Fields any staff member may change on their own record (My Profile). */
const SELF_EDITABLE = new Set(["name", "phone", "avatar"]);

export async function PATCH(req: Request) {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Please check the staff details.");
  const { uid, ...changes } = parsed.data;
  const ownProfileOnly = uid === ctx.uid && Object.keys(changes).every((k) => SELF_EDITABLE.has(k));
  if (ctx.staff.role !== ADMIN_ROLE && !ownProfileOnly) {
    return NextResponse.json({ ok: false, error: "Only the Admin role can manage staff." }, { status: 403 });
  }

  const ref = adminDb().collection("adminUsers").doc(uid);
  if (!(await ref.get()).exists) return NextResponse.json({ ok: false, error: "No such staff member." }, { status: 404 });
  await ref.update({ ...changes, updatedAt: new Date().toISOString() });

  if (changes.name !== undefined || changes.status !== undefined) {
    await adminAuth().updateUser(uid, {
      ...(changes.name !== undefined ? { displayName: changes.name } : {}),
      ...(changes.status !== undefined ? { disabled: changes.status !== "Active" } : {}),
    });
  }
  // Ends existing sessions so a deactivated staff member is signed out everywhere.
  if (changes.status === "Inactive") await adminAuth().revokeRefreshTokens(uid);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireAdminRole(req);
  if (ctx instanceof Response) return ctx;
  const uid = new URL(req.url).searchParams.get("uid");
  if (!uid) return bad("Missing uid.");
  if (uid === ctx.uid) return bad("You can't delete your own account.");
  await adminAuth().deleteUser(uid).catch((e: { code?: string }) => {
    if (e?.code !== "auth/user-not-found") throw e;
  });
  await adminDb().collection("adminUsers").doc(uid).delete();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff-auth";

/** The signed-in staff member's own record (no password). Used by the admin panel after sign-in. */
export async function GET(req: Request) {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;
  return NextResponse.json({ ok: true, user: ctx.staff }, { headers: { "Cache-Control": "private, no-store" } });
}

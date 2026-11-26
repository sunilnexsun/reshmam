import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminBucket } from "@/lib/firebase-admin";
import { requireStaff } from "@/lib/staff-auth";
import { canAccess } from "@/lib/staff-permissions";

const ALLOWED_PREFIXES = new Set([
  "products",
  "categories",
  "brands",
  "banners",
  "blogs",
  "testimonials",
  "avatars",
]);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // Matches storage.rules 2 MB limit
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function POST(req: Request) {
  const ctx = await requireStaff(req);
  if (ctx instanceof Response) return ctx;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const rawPrefix = String(formData.get("pathPrefix") || "products").trim().toLowerCase();

    if (!ALLOWED_PREFIXES.has(rawPrefix)) {
      return NextResponse.json({ ok: false, error: `Invalid upload path: ${rawPrefix}` }, { status: 400, headers: NO_STORE });
    }

    if (
      rawPrefix !== "avatars" &&
      !canAccess({ role: ctx.staff.role, roles: ctx.roles, col: rawPrefix, op: "write" })
    ) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_STORE });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Image file is required" }, { status: 400, headers: NO_STORE });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported image type. Please upload JPG, PNG, WebP, or GIF." },
        { status: 400, headers: NO_STORE }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `File "${file.name}" exceeds the 2 MB size limit.` },
        { status: 400, headers: NO_STORE }
      );
    }

    const cleanName = (file.name || "image.webp").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId = randomUUID().slice(0, 8);
    const objectPath = `${rawPrefix}/${Date.now()}_${uniqueId}_${cleanName}`;
    const token = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    const bucket = adminBucket();
    const fileRef = bucket.file(objectPath);
    await fileRef.save(buffer, {
      resumable: false,
      metadata: {
        contentType: file.type,
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedBy: ctx.uid,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      objectPath
    )}?alt=media&token=${token}`;

    return NextResponse.json({ ok: true, url, path: objectPath }, { headers: NO_STORE });
  } catch (err) {
    console.error("[Admin Upload API] error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload image to Firebase Storage";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: NO_STORE });
  }
}

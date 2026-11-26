import { NextResponse, type NextRequest } from "next/server";

/**
 * Product and blog slugs now come dynamically from Firestore (added in the admin panel),
 * so this file can't enumerate them statically. Both pages call notFound() themselves for
 * slugs that don't exist; here we only guard against deeper/malformed subpaths.
 *
 * The admin panel is always served: staff sign in with Firebase Auth, and the admin API and Firestore
 * rules refuse anyone who isn't active staff.
 */

/** decodeURIComponent throws on malformed escapes such as "%E0"; treat those as unknown slugs. */
function decode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const [, section, slug, extra] = request.nextUrl.pathname.split("/");
  if (section === "admin") {
    return NextResponse.next();
  }
  if (section === "products" || section === "blog") {
    // Only /products/<slug> and /blog/<slug>; deeper or malformed paths don't exist.
    return slug && (extra !== undefined || decode(slug) === null)
      ? NextResponse.rewrite(new URL("/__not-found", request.url))
      : NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:slug+", "/blog/:slug+", "/admin", "/admin/:path*"],
};

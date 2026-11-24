import { NextResponse, type NextRequest } from "next/server";
import { posts } from "./app/(storefront)/_lib/blog";

/**
 * Unknown blog slugs get a real HTTP 404 up front. (With Cache Components a streamed page can't change its
 * status after the shell is sent, and `dynamicParams = false` isn't supported, so we check here.)
 *
 * Product slugs are NOT checked here: products now come from Firestore (added in the admin panel), so this
 * file can't know them. The product page calls notFound() itself for slugs that don't exist.
 *
 * The admin panel is always served: staff sign in with Firebase Auth, and the admin API and Firestore
 * rules refuse anyone who isn't active staff.
 */
const postSlugs = new Set(posts.map((p) => p.slug));

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
  if (section === "products") {
    // Only /products/<slug>; deeper paths don't exist.
    return slug && (extra !== undefined || decode(slug) === null)
      ? NextResponse.rewrite(new URL("/__not-found", request.url))
      : NextResponse.next();
  }
  const name = slug ? decode(slug) : null;
  if (slug && (extra !== undefined || name === null || !postSlugs.has(name))) {
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:slug+", "/blog/:slug+", "/admin", "/admin/:path*"],
};

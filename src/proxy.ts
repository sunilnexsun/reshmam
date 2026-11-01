import { NextResponse, type NextRequest } from "next/server";
import { products } from "./app/(storefront)/_lib/products";
import { posts } from "./app/(storefront)/_lib/blog";

/**
 * Unknown product/blog slugs get a real HTTP 404 up front. (With Cache
 * Components a streamed page can't change its status after the shell is sent,
 * and `dynamicParams = false` isn't supported, so we check here.)
 *
 * The admin panel is a demo until it has real sign-in (Supabase Auth): its logins are checked in the
 * browser and listed on its login screen. It is served by default; set DISABLE_ADMIN_DEMO=1 on a
 * production server to answer /admin with a 404 instead.
 */
const productSlugs = new Set(products.map((p) => p.slug));
const postSlugs = new Set(posts.map((p) => p.slug));

/** decodeURIComponent throws on malformed escapes such as "%E0"; treat those as unknown slugs. */
function decode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export const adminDemoEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.DISABLE_ADMIN_DEMO !== "1";

export function proxy(request: NextRequest) {
  const [, section, slug, extra] = request.nextUrl.pathname.split("/");
  if (section === "admin") {
    return adminDemoEnabled() ? NextResponse.next() : NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  const known = section === "products" ? productSlugs : postSlugs;
  const name = slug ? decode(slug) : null;
  if (slug && (extra !== undefined || name === null || !known.has(name))) {
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:slug+", "/blog/:slug+", "/admin", "/admin/:path*"],
};

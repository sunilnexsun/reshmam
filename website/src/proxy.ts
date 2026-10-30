import { NextResponse, type NextRequest } from "next/server";
import { products } from "@/lib/products";
import { posts } from "@/lib/blog";

/**
 * Unknown product/blog slugs get a real HTTP 404 up front. (With Cache
 * Components a streamed page can't change its status after the shell is sent,
 * and `dynamicParams = false` isn't supported, so we check here.)
 */
const productSlugs = new Set(products.map((p) => p.slug));
const postSlugs = new Set(posts.map((p) => p.slug));

export function proxy(request: NextRequest) {
  const [, section, slug, extra] = request.nextUrl.pathname.split("/");
  const known = section === "products" ? productSlugs : postSlugs;
  if (slug && (extra !== undefined || !known.has(decodeURIComponent(slug)))) {
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:slug+", "/blog/:slug+"],
};

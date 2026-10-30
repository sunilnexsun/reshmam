import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { posts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "/",
    "/products",
    "/our-story",
    "/health-benefits",
    "/blog",
    "/contact",
    "/faq",
    "/shipping-delivery",
    "/returns-refund-policy",
    "/privacy-policy",
    "/terms-conditions",
    "/cancellation-policy",
    "/track-order",
    "/new-arrivals",
  ];
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    // Sample blog posts are excluded until approved content replaces them.
    ...posts.filter((p) => !p.sample).map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.date })),
  ];
}

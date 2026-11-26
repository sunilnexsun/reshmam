import type { MetadataRoute } from "next";
import { fetchDynamicProducts } from "./(storefront)/_lib/server/catalogue";
import { fetchDynamicBlogs } from "./(storefront)/_lib/server/content";
import { products as fallbackProducts } from "./(storefront)/_lib/products";
import { absoluteUrl } from "./(storefront)/_lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    "/",
    "/products",
    "/our-story",
    "/health-benefits",
    "/testimonials",
    "/blog",
    "/contact",
    "/faq",
    "/shipping-delivery",
    "/returns-refund-policy",
    "/privacy-policy",
    "/terms-conditions",
    "/cancellation-policy",
    "/track-order",
  ];
  const [dynamicProducts, dynamicBlogs] = await Promise.all([
    fetchDynamicProducts().catch(() => []),
    fetchDynamicBlogs().catch(() => []),
  ]);
  const prodList = dynamicProducts.length ? dynamicProducts : fallbackProducts;
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...prodList.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...dynamicBlogs.filter((p) => !p.sample).map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.date })),
  ];
}

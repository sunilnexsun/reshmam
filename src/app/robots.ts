import type { MetadataRoute } from "next";
import { absoluteUrl } from "./(storefront)/_lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/account", "/wishlist"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

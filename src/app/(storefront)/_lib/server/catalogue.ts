import "server-only";
import { cacheLife } from "next/cache";
import type { LiveVariants } from "@storefront/_lib/live";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getDynamicCatalogue } from "@/lib/catalogue-data";
import { type Product, type Category, type Branch } from "@storefront/_lib/products";

/** Live stock and prices straight from Firestore (uncached) — for checkout. */
export async function fetchLiveVariants(ids?: string[]): Promise<LiveVariants> {
  try {
    const snap = await getDocs(collection(db, "variants"));
    const map: LiveVariants = {};
    snap.forEach((d) => {
      const data = d.data();
      const variantId = d.id;
      const sku = data.sku as string | undefined;
      const shouldInclude = !ids || ids.includes(variantId) || (sku && ids.includes(sku));

      if (shouldInclude) {
        const active = data.status !== "Inactive";
        const entry = {
          stock: typeof data.stock === "number" ? data.stock : 0,
          price: typeof data.price === "number" ? data.price : 0,
          active,
        };
        map[variantId] = entry;
        if (sku) {
          map[sku] = entry;
        }
      }
    });
    return map;
  } catch (err) {
    console.error("fetchLiveVariants from Firestore error:", err);
    return {};
  }
}

/**
 * Live stock and prices for display, cached briefly so pages stay responsive.
 */
export async function getLiveVariants(): Promise<LiveVariants | null> {
  "use cache";
  cacheLife("minutes");
  try {
    const live = await fetchLiveVariants();
    return Object.keys(live).length > 0 ? live : null;
  } catch (err) {
    console.error("Could not load live stock from Firestore", err);
    return null;
  }
}

/** Loads 100% dynamic products exclusively from Firestore backend. */
export async function fetchDynamicProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const dynamic = await getDynamicCatalogue();
    if (dynamic && dynamic.products.length > 0) {
      return dynamic.products;
    }
  } catch (err) {
    console.error("fetchDynamicProducts error:", err);
  }
  return [];
}

/** Loads a single product by slug or id exclusively from Firestore backend. */
export async function fetchDynamicProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  const all = await fetchDynamicProducts();
  const clean = slug.toLowerCase();
  return (
    all.find(
      (p) =>
        p.slug.toLowerCase() === clean ||
        p.id?.toLowerCase() === clean ||
        p.slug.toLowerCase() === clean.replace(/^p_cf_/, "").replace(/^p_rs_/, "") ||
        p.id?.toLowerCase() === "p_" + clean.replace(/-/g, "_")
    ) ?? null
  );
}

/** Loads dynamic categories exclusively from Firestore backend. */
export async function fetchDynamicCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const dynamic = await getDynamicCatalogue();
    if (dynamic && dynamic.categories.length > 0) {
      return dynamic.categories;
    }
  } catch (err) {
    console.error("fetchDynamicCategories error:", err);
  }
  return [];
}

/** Loads dynamic branches exclusively from Firestore backend. */
export async function fetchDynamicBranches(): Promise<Branch[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const dynamic = await getDynamicCatalogue();
    if (dynamic && dynamic.branches.length > 0) {
      return dynamic.branches;
    }
  } catch (err) {
    console.error("fetchDynamicBranches error:", err);
  }
  return [];
}

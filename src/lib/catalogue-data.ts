import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import type { Product, Category, Variant } from "@storefront/_lib/products";

export function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface FirestoreRawProduct {
  id: string;
  name?: string;
  shortName?: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string | string[];
  featured?: boolean;
  newArrival?: boolean;
  gst?: number;
  hsn?: string;
  images?: string[];
  primaryImage?: number;
  status?: string;
  unitType?: string;
  slug?: string;
  branch?: string;
  uses?: string[];
  [key: string]: unknown;
}

export interface FirestoreRawVariant {
  id: string;
  productId: string;
  branchId?: string;
  size?: string;
  unitType?: string;
  sku?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  alertStock?: number;
  status?: string;
  image?: string;
  [key: string]: unknown;
}

export function formatProduct(raw: FirestoreRawProduct, rawVariants: FirestoreRawVariant[]): Product {
  const name = raw.name || "Untitled Product";
  const slug = raw.slug || (raw.id ? raw.id.replace(/^p_/, "").replace(/_/g, "-") : "") || slugify(name);
  const rawCategory = raw.category || "General";
  const categorySlug = slugify(rawCategory);

  const images = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : ["/images/product-gingelly.webp"];
  const primaryIdx = typeof raw.primaryImage === "number" && raw.primaryImage < images.length ? raw.primaryImage : 0;
  const image = images[primaryIdx] || images[0];

  const summary = typeof raw.description === "string" ? raw.description : Array.isArray(raw.description) ? raw.description[0] || "" : "";
  const description = Array.isArray(raw.description)
    ? raw.description
    : typeof raw.description === "string" && raw.description.trim()
      ? [raw.description]
      : ["Pure, authentic, and naturally crafted for your everyday well-being."];

  const isCattleFeed = categorySlug === "cattle-feed" || rawCategory.toLowerCase().includes("cattle");
  const isCastor = categorySlug === "castor-oil" || rawCategory.toLowerCase().includes("castor");

  const defaultUses = isCattleFeed
    ? ["High-protein supplemental feed for cows and buffaloes", "Improves cattle health and milk yield naturally"]
    : isCastor
      ? ["Hair strengthening and scalp massage", "Traditional cooling oil bath and Ayurvedic uses"]
      : ["Tempering, sautéing and South Indian cooking", "Daily healthy nutritional cooking"];

  const uses = Array.isArray(raw.uses) && raw.uses.length > 0 ? raw.uses : defaultUses;

  const activeVariants = rawVariants.filter((v) => v.status !== "Inactive");

  const variants: Variant[] =
    activeVariants.length > 0
      ? activeVariants.map((v) => ({
          id: v.id || v.sku || `${slug}-${slugify(v.size || "standard")}`,
          label: v.size || (raw.unitType ? `1 ${raw.unitType}` : "Standard Pack"),
          price: Number(v.price || 0),
          stock: Number(v.stock ?? 0),
          image: v.image || undefined,
        }))
      : [
          {
            id: `v_${raw.id || slug}`,
            label: raw.unitType ? `1 ${raw.unitType}` : "Standard",
            price: 0,
            stock: 0,
          },
        ];

  const isCombo = name.toLowerCase().includes("combo") || categorySlug.includes("combo");
  const isPack = name.toLowerCase().includes("pack") || categorySlug.includes("pack");

  return {
    slug,
    name,
    shortName: raw.shortName || (name.length > 30 ? name.split(" – ")[0].split(" (")[0] : name),
    category: categorySlug,
    kind: isCombo ? "combo" : isPack ? "pack" : "single",
    branch: raw.branch || "reshmam",
    image,
    // Admin uploads are product packshots (bottles on white): show them whole, never cropped.
    imageFit: "contain",
    imageAlt: name,
    summary,
    description,
    uses,
    edible: !isCattleFeed && !isCastor,
    bestseller: Boolean(raw.featured),
    newArrival: Boolean(raw.newArrival),
    variants,
  };
}

export interface DynamicBranch {
  slug: string;
  name: string;
  code?: string;
  city?: string;
  status?: string;
}

export async function getDynamicCatalogue() {
  try {
    const [pSnap, vSnap, cSnap, bSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "variants")),
      getDocs(collection(db, "categories")),
      getDocs(collection(db, "branches")),
    ]);

    const branches: DynamicBranch[] = [];
    bSnap.forEach((d) => {
      const data = d.data();
      if (data.status === "Inactive") return;
      const rawName = data.name || "Main";
      const slug = data.slug || (d.id ? d.id.replace(/^br_/, "").replace(/_/g, "-") : "") || slugify(rawName);
      branches.push({
        slug,
        name: rawName.toLowerCase().includes("branch") ? rawName : `${rawName} Branch`,
        code: data.code,
        city: data.city,
        status: data.status,
      });
    });

    const variantsByProduct: Record<string, FirestoreRawVariant[]> = {};
    vSnap.forEach((d) => {
      const v = { id: d.id, ...d.data() } as FirestoreRawVariant;
      if (!v.productId) return;
      if (!variantsByProduct[v.productId]) variantsByProduct[v.productId] = [];
      variantsByProduct[v.productId].push(v);
    });

    const products: Product[] = [];
    const categoryMap = new Map<string, Category>();

    cSnap.forEach((d) => {
      const data = d.data();
      const slug = data.slug || slugify(data.name || d.id);
      categoryMap.set(slug, {
        slug,
        name: data.name || "Category",
        shortName: data.name ? data.name.replace(/\s*\(.*\)/, "") : "Category",
        description: data.description || "",
        image: data.image || "/images/product-gingelly.webp",
      });
    });

    pSnap.forEach((d) => {
      const raw = { id: d.id, ...d.data() } as FirestoreRawProduct;
      if (raw.status === "Inactive") return;

      const prodVariants = variantsByProduct[raw.id] || [];
      const prod = formatProduct(raw, prodVariants);
      products.push(prod);

      // Auto-register category if not in Firestore categories
      const catSlug = prod.category;
      if (!categoryMap.has(catSlug) && raw.category) {
        categoryMap.set(catSlug, {
          slug: catSlug,
          name: raw.category,
          shortName: raw.category,
          description: `Premium quality ${raw.category.toLowerCase()} from RESHMAM`,
          image: prod.image,
        });
      }
    });

    const categories = Array.from(categoryMap.values());
    return { products, categories, branches };
  } catch (err) {
    console.error("Failed to load dynamic catalogue from Firestore:", err);
    return null;
  }
}

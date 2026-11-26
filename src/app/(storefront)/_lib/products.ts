/**
 * Product catalogue types and helpers.
 * All actual product and category data is loaded dynamically from Cloud Firestore.
 */

export type CategorySlug =
  | "gingelly-oil"
  | "groundnut-oil"
  | "coconut-oil"
  | "castor-oil"
  | "combo-packs"
  | "cattle-feed"
  | string;

export type BranchSlug = string;

export interface Branch {
  slug: BranchSlug;
  name: string;
  code?: string;
  city?: string;
  status?: string;
}

/** Pure dynamic data - no static branches */
export const branches: Branch[] = [];

export const branchName = (b?: BranchSlug, branchList: Branch[] = branches) => {
  const found = branchList.find((x) => x.slug === b || x.slug.toLowerCase() === String(b).toLowerCase());
  if (found) return found.name;
  if (!b) return "Reshmam Branch";
  const formatted = String(b).replace(/^br_/, "").replace(/-/g, " ");
  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  return capitalized.toLowerCase().includes("branch") ? capitalized : `${capitalized} Branch`;
};

export type Category = {
  slug: CategorySlug;
  name: string;
  shortName: string;
  description: string;
  image: string;
};

export type Variant = {
  id: string; // unique SKU or ID
  label: string; // "500 ml", "1 L x 2", "50 kg"
  price: number; // INR, inclusive of taxes
  stock: number; // units available
  image?: string;
  mrp?: number;
};

export type Product = {
  id?: string;
  slug: string;
  name: string;
  shortName: string;
  category: CategorySlug;
  kind: "single" | "pack" | "combo";
  branch: BranchSlug;
  image: string;
  /** Every photo of the product, the main one (`image`) first. */
  images?: string[];
  imageAlt: string;
  summary: string;
  description: string[];
  uses: string[];
  notice?: string;
  useLabel?: string;
  imageFit?: "cover" | "contain";
  edible: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  brand?: string;
  variants: Variant[];
};

/** The photo for a chosen size: the variant's own image when it has one, else the product's. */
export function variantImage(product: Product, variant?: Pick<Variant, "image">) {
  return variant?.image ?? product.image;
}

/** Pure dynamic data - no static product mocks. */
export const categories: Category[] = [];
export const products: Product[] = [];

/** Category membership for filters — combo pack appears under "All" only. */
export function productsInCategory(
  slug: CategorySlug | "all",
  branch: BranchSlug | "all" = "all",
  productList: Product[] = products,
) {
  return productList.filter(
    (p) =>
      (branch === "all" || p.branch === branch) &&
      (slug === "all" || (p.category === slug && p.kind !== "combo")),
  );
}

export function getProduct(slug: string, productList: Product[] = products) {
  const s = slug.toLowerCase();
  return productList.find(
    (p) =>
      p.slug.toLowerCase() === s ||
      p.id?.toLowerCase() === s ||
      p.slug.toLowerCase() === s.replace(/^p_cf_/, "").replace(/^p_rs_/, "") ||
      p.id?.toLowerCase() === "p_" + s.replace(/-/g, "_")
  );
}

export function getCategory(slug: string, categoryList: Category[] = categories) {
  return categoryList.find((c) => c.slug === slug);
}

export function findVariant(variantId: string, productList: Product[] = products) {
  for (const product of productList) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => v.price);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function isInStock(p: Product) {
  return p.variants.some((v) => v.stock > 0);
}

export function searchProducts(query: string, productList: Product[] = products) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return productList.filter((p) =>
    [
      p.name,
      p.shortName,
      p.summary,
      p.category,
      p.brand || "",
      branchName(p.branch),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

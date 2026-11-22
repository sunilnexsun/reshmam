/**
 * Product catalogue — the single source of truth for the storefront.
 *
 * PROVISIONAL SEED DATA: price ranges and sizes are taken from the supplied
 * reference screenshots (e.g. Gingelly ₹350–₹600 across 500 ml / 1 L).
 * Middle-size prices and stock figures are placeholders and MUST be confirmed
 * by the business. The same data is mirrored into Supabase by
 * `supabase/seed.sql`; if you edit prices here, update the seed too
 * (or load products from the database — see README).
 */

export type CategorySlug =
  | "gingelly-oil"
  | "groundnut-oil"
  | "coconut-oil";

/** Branches products are sold under. With only one, the storefront hides the branch filter. */
export type BranchSlug = "reshmam";
export const branches: { slug: BranchSlug; name: string }[] = [
  { slug: "reshmam", name: "Reshmam Branch" },
];
export const branchName = (b: BranchSlug) =>
  branches.find((x) => x.slug === b)!.name;

export type Category = {
  slug: CategorySlug;
  name: string;
  shortName: string;
  description: string;
  image: string;
};

export type Variant = {
  id: string; // unique SKU
  label: string; // "500 ml", "1 L x 2"
  price: number; // INR, inclusive of taxes
  stock: number; // units available
  /** Photo of this exact pack (e.g. the 1 L bottle); falls back to the product image. */
  image?: string;
};

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  category: CategorySlug;
  kind: "single" | "pack" | "combo";
  branch: BranchSlug;
  image: string;
  imageAlt: string;
  summary: string;
  description: string[];
  uses: string[];
  /** Shown prominently, e.g. a safety or usage note. */
  notice?: string;
  /** Short label shown on cards, e.g. "External use only". */
  useLabel?: string;
  /** "contain" for logo/packaging artwork that must not be cropped. */
  imageFit?: "cover" | "contain";
  edible: boolean;
  bestseller?: boolean;
  /** Shown on the New Arrivals page. */
  newArrival?: boolean;
  variants: Variant[];
};

/** The photo for a chosen size: the variant's own image when it has one, else the product's. */
export function variantImage(product: Product, variant?: Pick<Variant, "image">) {
  return variant?.image ?? product.image;
}

export const categories: Category[] = [
  {
    slug: "gingelly-oil",
    name: "Gingelly Oil (Sesame Oil)",
    shortName: "Gingelly Oil",
    description: "Rich in flavour, a staple of South Indian kitchens.",
    image: "/images/products/gingelly-1l.webp",
  },
  {
    slug: "groundnut-oil",
    name: "Groundnut Oil (Peanut Oil)",
    shortName: "Groundnut Oil",
    description: "Pure taste for your everyday cooking.",
    image: "/images/products/groundnut-1l.webp",
  },
  {
    slug: "coconut-oil",
    name: "Coconut Oil",
    shortName: "Coconut Oil",
    description: "Natural goodness in every drop.",
    image: "/images/products/coconut-1l.webp",
  },
];

export const products: Product[] = [
  {
    slug: "gingelly-oil",
    name: "Traditional Cold Pressed Gingelly Oil (Sesame Oil)",
    shortName: "Gingelly Oil",
    category: "gingelly-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/products/gingelly-500ml.webp",
    imageFit: "contain",
    imageAlt:
      "Bottle of RESHMAM cold pressed gingelly oil",
    summary: "Wooden chekku pressed sesame oil with a rich, nutty aroma.",
    description: [
      "Pressed slowly from sesame seeds in a traditional wooden chekku, without heat-based refining or chemical solvents.",
      "Its deep aroma suits tempering, idli podi, kuzhambu and everyday South Indian cooking.",
    ],
    uses: [
      "Tempering and everyday South Indian cooking",
      "Traditional oil-bath and skin care routines",
    ],
    edible: true,
    bestseller: true,
    variants: [
      { id: "GIN-500ML", label: "500 ml", price: 350, stock: 120, image: "/images/products/gingelly-500ml.webp" },
      { id: "GIN-1L", label: "1 L", price: 600, stock: 90, image: "/images/products/gingelly-1l.webp" },
    ],
  },
  {
    slug: "groundnut-oil",
    name: "Traditional Cold Pressed Groundnut Oil (Peanut Oil)",
    shortName: "Groundnut Oil",
    category: "groundnut-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/products/groundnut-500ml.webp",
    imageFit: "contain",
    imageAlt:
      "Bottle of RESHMAM cold pressed groundnut oil",
    summary:
      "Mild, everyday cooking oil pressed from carefully sourced groundnuts.",
    description: [
      "Cold pressed groundnut oil with a clean, mild flavour that works across daily cooking.",
      "Suitable for sautéing, curries and traditional frying.",
    ],
    uses: ["Everyday cooking and sautéing", "Traditional frying"],
    edible: true,
    bestseller: true,
    variants: [
      { id: "GRN-500ML", label: "500 ml", price: 300, stock: 140, image: "/images/products/groundnut-500ml.webp" },
      { id: "GRN-1L", label: "1 L", price: 550, stock: 100, image: "/images/products/groundnut-1l.webp" },
    ],
  },
  {
    slug: "coconut-oil",
    name: "Traditional Cold Pressed Coconut Oil",
    shortName: "Coconut Oil",
    category: "coconut-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/products/coconut-500ml.webp",
    imageFit: "contain",
    imageAlt:
      "Bottle of RESHMAM cold pressed coconut oil",
    summary: "Fragrant coconut oil for cooking, baking and hair care.",
    description: [
      "Pressed from dried coconut kernels using the traditional chekku method.",
      "Its natural coconut aroma is loved in Kerala-style dishes, baking, and traditional hair care.",
    ],
    uses: ["Cooking and baking", "Traditional skin and hair care"],
    edible: true,
    bestseller: true,
    variants: [
      { id: "COC-500ML", label: "500 ml", price: 320, stock: 110, image: "/images/products/coconut-500ml.webp" },
      { id: "COC-1L", label: "1 L", price: 580, stock: 80, image: "/images/products/coconut-1l.webp" },
    ],
  },
  {
    slug: "gingelly-oil-family-pack",
    name: "Gingelly Oil Family Pack",
    shortName: "Gingelly Family Pack",
    category: "gingelly-oil",
    kind: "pack",
    branch: "reshmam",
    image: "/images/pack-gingelly.webp",
    imageAlt: "Two bottles of RESHMAM gingelly oil with sesame seeds",
    summary: "Value pack of our cold pressed gingelly oil for larger families.",
    description: [
      "Our traditional cold pressed gingelly oil in a value family pack.",
    ],
    uses: ["Everyday South Indian cooking"],
    edible: true,
    variants: [
      { id: "GIN-FP-1Lx2", label: "1 L x 2", price: 650, stock: 50 },
    ],
  },
  {
    slug: "groundnut-oil-family-pack",
    name: "Groundnut Oil Family Pack",
    shortName: "Groundnut Family Pack",
    category: "groundnut-oil",
    kind: "pack",
    branch: "reshmam",
    image: "/images/pack-groundnut.webp",
    imageAlt: "Two bottles of RESHMAM groundnut oil with groundnuts",
    summary: "Value pack of cold pressed groundnut oil for daily cooking.",
    description: [
      "Our traditional cold pressed groundnut oil in a value family pack.",
    ],
    uses: ["Everyday cooking and frying"],
    edible: true,
    variants: [
      { id: "GRN-FP-1Lx2", label: "1 L x 2", price: 600, stock: 50 },
    ],
  },
  {
    slug: "coconut-oil-family-pack",
    name: "Coconut Oil Family Pack",
    shortName: "Coconut Family Pack",
    category: "coconut-oil",
    kind: "pack",
    branch: "reshmam",
    image: "/images/pack-coconut.webp",
    imageAlt: "Two bottles of RESHMAM coconut oil with coconuts",
    summary: "Value pack of cold pressed coconut oil.",
    description: [
      "Our traditional cold pressed coconut oil in a value family pack.",
    ],
    uses: ["Cooking, baking, and hair care"],
    edible: true,
    variants: [
      { id: "COC-FP-1Lx2", label: "1 L x 2", price: 650, stock: 40 },
    ],
  },
  {
    slug: "combo-oil-gift-pack",
    name: "Combo Oil Gift Pack",
    shortName: "Combo Gift Pack",
    category: "gingelly-oil",
    kind: "combo",
    branch: "reshmam",
    image: "/images/pack-combo.webp",
    imageAlt: "RESHMAM oil bottles beside a gift box with a red ribbon",
    summary: "Gingelly, groundnut and coconut oil together in a gift pack.",
    description: [
      "A thoughtful gift of three RESHMAM cooking oils: gingelly, groundnut and coconut.",
    ],
    uses: ["Gifting for festivals and family occasions"],
    edible: true,
    // PROVISIONAL: prices scaled from the earlier four-oil pack; confirm with the business.
    variants: [
      { id: "COMBO-500MLx3", label: "500 ml x 3", price: 900, stock: 30 },
      { id: "COMBO-1Lx3", label: "1 L x 3", price: 1725, stock: 20 },
    ],
  },

  /* ---------------- Products from the business's own catalogue (Oct 2026) ----------------
     Names, branches, prices and pack sizes as supplied by RESHMAM. Stock is a placeholder. */
  {
    slug: "reshmam-sesame-oil",
    newArrival: true,
    name: "RESHMAM Sesame Oil",
    shortName: "RESHMAM Sesame Oil",
    category: "gingelly-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/reshmam-sesame-oil.webp",
    imageAlt: "RESHMAM Agmark sesame oil pouch, Healthy Food Healthy Life",
    summary:
      "Specially crafted small-batch sesame oil from our Reshmam branch. Perfect for daily cooking.",
    description: [
      "Specially crafted small-batch sesame oil from our Reshmam branch.",
      "Perfect for daily cooking and traditional South Indian dishes.",
    ],
    uses: ["Daily cooking", "Tempering and traditional dishes"],
    edible: true,
    variants: [
      { id: "RSH-SES-500ML", label: "500 ml", price: 160, stock: 100 },
    ],
  },
];

/** Category membership for filters — combo pack appears under "All" only. */
export function productsInCategory(
  slug: CategorySlug | "all",
  branch: BranchSlug | "all" = "all",
) {
  return products.filter(
    (p) =>
      (branch === "all" || p.branch === branch) &&
      (slug === "all" || (p.category === slug && p.kind !== "combo")),
  );
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function findVariant(variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function isInStock(p: Product) {
  return p.variants.some((v) => v.stock > 0);
}

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) =>
    [
      p.name,
      p.shortName,
      p.summary,
      getCategory(p.category)?.name ?? "",
      branchName(p.branch),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

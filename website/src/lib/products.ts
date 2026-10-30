/**
 * Product catalogue — the single source of truth for the storefront.
 *
 * PROVISIONAL SEED DATA: price ranges and sizes are taken from the supplied
 * reference screenshots (e.g. Gingelly ₹350–₹950 across 500 ml / 1 L / 5 L).
 * Middle-size prices and stock figures are placeholders and MUST be confirmed
 * by the business. The same data is mirrored into Supabase by
 * `supabase/seed.sql`; if you edit prices here, update the seed too
 * (or load products from the database — see README).
 */

export type CategorySlug =
  | "gingelly-oil"
  | "groundnut-oil"
  | "coconut-oil"
  | "castor-oil"
  | "cattle-feed";

/** The two RESHMAM branches products are sold under. */
export type BranchSlug = "velum-mayilum" | "reshmam";
export const branches: { slug: BranchSlug; name: string }[] = [
  { slug: "velum-mayilum", name: "Velum Mayilum Branch" },
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
  /** Shown prominently, e.g. castor oil is for external use. */
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

export const categories: Category[] = [
  {
    slug: "gingelly-oil",
    name: "Gingelly Oil (Sesame Oil)",
    shortName: "Gingelly Oil",
    description: "Rich in flavour, a staple of South Indian kitchens.",
    image: "/images/product-gingelly.webp",
  },
  {
    slug: "groundnut-oil",
    name: "Groundnut Oil (Peanut Oil)",
    shortName: "Groundnut Oil",
    description: "Pure taste for your everyday cooking.",
    image: "/images/product-groundnut.webp",
  },
  {
    slug: "coconut-oil",
    name: "Coconut Oil",
    shortName: "Coconut Oil",
    description: "Natural goodness in every drop.",
    image: "/images/product-coconut.webp",
  },
  {
    slug: "castor-oil",
    name: "Castor Oil",
    shortName: "Castor Oil",
    description: "Traditional oil for external wellness care.",
    image: "/images/product-castor.webp",
  },
  {
    slug: "cattle-feed",
    name: "Gingelly Oil Cake (Cattle Feed)",
    shortName: "Cattle Feed",
    description: "Rotary gingelly oil cake, nutritious feed for cattle.",
    image: "/images/mayil-oil-cake.webp",
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
    image: "/images/product-gingelly.webp",
    imageAlt:
      "Bottle of RESHMAM cold pressed gingelly oil with sesame seeds and leaves",
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
      { id: "GIN-500ML", label: "500 ml", price: 350, stock: 120 },
      { id: "GIN-1L", label: "1 L", price: 600, stock: 90 },
      { id: "GIN-5L", label: "5 L", price: 950, stock: 25 },
    ],
  },
  {
    slug: "groundnut-oil",
    name: "Traditional Cold Pressed Groundnut Oil (Peanut Oil)",
    shortName: "Groundnut Oil",
    category: "groundnut-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/product-groundnut.webp",
    imageAlt:
      "Bottle of RESHMAM cold pressed groundnut oil with groundnuts and leaves",
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
      { id: "GRN-500ML", label: "500 ml", price: 300, stock: 140 },
      { id: "GRN-1L", label: "1 L", price: 550, stock: 100 },
      { id: "GRN-5L", label: "5 L", price: 850, stock: 30 },
    ],
  },
  {
    slug: "coconut-oil",
    name: "Traditional Cold Pressed Coconut Oil",
    shortName: "Coconut Oil",
    category: "coconut-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/product-coconut.webp",
    imageAlt:
      "Bottle of RESHMAM cold pressed coconut oil beside a split coconut",
    summary: "Fragrant coconut oil for cooking, baking and hair care.",
    description: [
      "Pressed from dried coconut kernels using the traditional chekku method.",
      "Its natural coconut aroma is loved in Kerala-style dishes, baking, and traditional hair care.",
    ],
    uses: ["Cooking and baking", "Traditional skin and hair care"],
    edible: true,
    bestseller: true,
    variants: [
      { id: "COC-500ML", label: "500 ml", price: 320, stock: 110 },
      { id: "COC-1L", label: "1 L", price: 580, stock: 80 },
      { id: "COC-5L", label: "5 L", price: 900, stock: 20 },
    ],
  },
  {
    slug: "castor-oil",
    name: "Traditional Cold Pressed Castor Oil",
    shortName: "Castor Oil",
    category: "castor-oil",
    kind: "single",
    branch: "reshmam",
    image: "/images/product-castor.webp",
    imageAlt:
      "Bottle of RESHMAM cold pressed castor oil with castor seeds and leaves",
    summary: "Thick, traditional castor oil for external wellness use.",
    description: [
      "Cold pressed castor oil used traditionally for massage, hair and skin care.",
      "This is not a cooking oil.",
    ],
    uses: ["Massage and external wellness care", "Hair and skin care routines"],
    notice:
      "For external use only. Not a cooking oil. Do not ingest or use it to treat any condition without guidance from a qualified medical professional.",
    useLabel: "External use only",
    edible: false,
    variants: [
      { id: "CAS-500ML", label: "500 ml", price: 280, stock: 60 },
      { id: "CAS-1L", label: "1 L", price: 450, stock: 40 },
      { id: "CAS-5L", label: "5 L", price: 700, stock: 0 },
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
      { id: "GIN-FP-5L", label: "5 L", price: 1800, stock: 15 },
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
      { id: "GRN-FP-5L", label: "5 L", price: 1650, stock: 15 },
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
      { id: "COC-FP-5L", label: "5 L", price: 1750, stock: 12 },
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
    imageAlt: "Four RESHMAM oil bottles beside a gift box with a red ribbon",
    summary:
      "Gingelly, groundnut, coconut and castor oil together in a gift pack.",
    description: [
      "A thoughtful gift of all four RESHMAM oils: gingelly, groundnut, coconut and castor.",
      "Castor oil in this pack is for external use only.",
    ],
    uses: ["Gifting for festivals and family occasions"],
    notice:
      "Contains castor oil, which is for external use only and is not a cooking oil.",
    edible: true,
    variants: [
      { id: "COMBO-500MLx4", label: "500 ml x 4", price: 1200, stock: 30 },
      { id: "COMBO-1Lx4", label: "1 L x 4", price: 2300, stock: 20 },
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
  {
    slug: "premium-gingelly-oil",
    newArrival: true,
    name: "Premium Gingelly Oil",
    shortName: "Premium Gingelly Oil",
    category: "gingelly-oil",
    kind: "single",
    branch: "velum-mayilum",
    image: "/images/product-gingelly.webp",
    imageAlt: "Bottle of gingelly oil with sesame seeds",
    summary:
      "Cold-pressed sesame oil with rich flavour and nutrients. Perfect for traditional cooking.",
    description: [
      "Cold-pressed sesame oil with rich flavour and naturally occurring nutrients.",
      "Perfect for traditional cooking.",
    ],
    uses: ["Traditional cooking", "Tempering"],
    edible: true,
    variants: [{ id: "VM-GIN-500ML", label: "500 ml", price: 180, stock: 100 }],
  },
  {
    slug: "pure-coconut-oil",
    newArrival: true,
    name: "Pure Coconut Oil",
    shortName: "Pure Coconut Oil",
    category: "coconut-oil",
    kind: "single",
    branch: "velum-mayilum",
    image: "/images/product-coconut.webp",
    imageAlt: "Bottle of coconut oil beside a split coconut",
    summary:
      "Traditional extraction method for maximum purity. Ideal for cooking, hair care and skin care.",
    description: [
      "Made with the traditional extraction method for maximum purity.",
      "Ideal for cooking, hair care and skin care.",
    ],
    uses: ["Cooking", "Hair and skin care"],
    edible: true,
    variants: [{ id: "VM-COC-500ML", label: "500 ml", price: 150, stock: 100 }],
  },
  {
    slug: "velum-mayilum-groundnut-oil",
    newArrival: true,
    name: "Groundnut Oil",
    shortName: "Groundnut Oil (Velum Mayilum)",
    category: "groundnut-oil",
    kind: "single",
    branch: "velum-mayilum",
    image: "/images/product-groundnut.webp",
    imageAlt: "Bottle of groundnut oil with groundnuts",
    summary:
      "Fresh groundnut oil perfect for all cooking needs. High smoke point for deep frying.",
    description: [
      "Fresh groundnut oil, perfect for all cooking needs.",
      "High smoke point, suited to deep frying.",
    ],
    uses: ["Everyday cooking", "Deep frying"],
    edible: true,
    variants: [{ id: "VM-GRN-500ML", label: "500 ml", price: 120, stock: 100 }],
  },
  {
    slug: "mayil-rotary-gingelly-oil-cake",
    newArrival: true,
    name: "Mayil Rotary Gingelly Oil Cake Cattle Feed",
    shortName: "Mayil Oil Cake Cattle Feed",
    category: "cattle-feed",
    kind: "single",
    branch: "velum-mayilum",
    image: "/images/mayil-oil-cake.webp",
    imageFit: "contain",
    imageAlt: "Mayil Brand logo with a peacock",
    summary:
      "High-quality Mayil brand rotary gingelly oil cake cattle feed. Only available in 50 kg sacks.",
    description: [
      "High-quality Mayil brand rotary gingelly oil cake for cattle feed.",
      "Only available in 50 kg sacks.",
    ],
    uses: ["Cattle feed"],
    notice:
      "Animal feed — not for human consumption. Sold only in 50 kg sacks.",
    useLabel: "Cattle feed · 50 kg sack",
    edible: false,
    variants: [{ id: "VM-MAYIL-50KG", label: "50 kg", price: 1800, stock: 40 }],
  },
  {
    slug: "jothi-rotary-gingelly-oil-cake",
    newArrival: true,
    name: "Jothi Rotary Gingelly Oil Cake Cattle Feed",
    shortName: "Jothi Oil Cake Cattle Feed",
    category: "cattle-feed",
    kind: "single",
    branch: "velum-mayilum",
    image: "/images/jothi-oil-cake.webp",
    imageFit: "contain",
    imageAlt: "Jothi Brand logo with an oil lamp",
    summary:
      "Premium Jothi brand rotary gingelly oil cake cattle feed. Only available in 50 kg sacks.",
    description: [
      "Premium Jothi brand rotary gingelly oil cake for cattle feed.",
      "Only available in 50 kg sacks.",
    ],
    uses: ["Cattle feed"],
    notice:
      "Animal feed — not for human consumption. Sold only in 50 kg sacks.",
    useLabel: "Cattle feed · 50 kg sack",
    edible: false,
    variants: [{ id: "VM-JOTHI-50KG", label: "50 kg", price: 1850, stock: 40 }],
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

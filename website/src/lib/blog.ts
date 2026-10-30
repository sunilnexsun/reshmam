/**
 * Blog articles. These are SAMPLE articles written as placeholders and are
 * labelled as such on the site. Replace them with approved content (or load
 * from the `blog_articles` table) before launch.
 */
export type BlogPost = {
  slug: string;
  title: string;
  category: "Cooking Tips" | "Oil Education" | "Wellness";
  date: string; // ISO
  excerpt: string;
  image: string;
  imageAlt: string;
  body: { heading?: string; paragraphs?: string[]; list?: string[] }[];
  sample: true;
};

export const posts: BlogPost[] = [
  {
    slug: "cooking-tips-with-cold-pressed-oils",
    title: "5 Everyday Cooking Tips with Cold Pressed Oils",
    category: "Cooking Tips",
    date: "2026-09-18",
    excerpt: "Simple ways to bring traditional cold pressed oils into your daily cooking.",
    image: "/images/use-cooking.webp",
    imageAlt: "Idli served with sambar and a bowl of oil",
    sample: true,
    body: [
      {
        paragraphs: [
          "Cold pressed oils carry the natural aroma of the seed or nut they come from. A few small habits help you get the best from them in an everyday kitchen.",
        ],
      },
      {
        heading: "Match the oil to the dish",
        list: [
          "Gingelly oil suits tempering, kuzhambu and idli podi.",
          "Groundnut oil is a dependable choice for daily sautéing and frying.",
          "Coconut oil brings its own fragrance to Kerala-style dishes and baking.",
        ],
      },
      {
        heading: "Store it well",
        paragraphs: [
          "Keep bottles tightly closed, away from direct sunlight and the stove. Use a clean, dry spoon or pourer so moisture does not get in.",
        ],
      },
      {
        heading: "Use moderate heat",
        paragraphs: [
          "Heat the oil gently and add your tempering once it shimmers. Avoid letting any oil smoke, and do not reuse oil that has been heated for deep frying many times.",
        ],
      },
    ],
  },
  {
    slug: "what-does-cold-pressed-mean",
    title: "What Does “Cold Pressed” Actually Mean?",
    category: "Oil Education",
    date: "2026-08-30",
    excerpt: "A plain-language look at the wooden chekku method and how it differs from refined oil production.",
    image: "/images/story-hero.webp",
    imageAlt: "Traditional wooden chekku oil press with sesame seeds",
    sample: true,
    body: [
      {
        paragraphs: [
          "“Cold pressed” describes oil extracted mechanically, at low temperatures, rather than with high heat or chemical solvents.",
        ],
      },
      {
        heading: "The wooden chekku",
        paragraphs: [
          "In a chekku, a wooden pestle turns slowly inside a mortar filled with seeds. The slow pressing releases oil while keeping friction heat low. The oil is then left to settle and filtered before bottling.",
        ],
      },
      {
        heading: "How it differs from refined oil",
        paragraphs: [
          "Refined oils are typically processed with heat and solvents, then bleached and deodorised. Cold pressed oils skip these steps, which is why they keep more of their natural colour, aroma and flavour.",
        ],
      },
    ],
  },
  {
    slug: "traditional-oils-for-a-healthier-family",
    title: "Traditional Oils and Balanced Family Meals",
    category: "Wellness",
    date: "2026-08-12",
    excerpt: "Bringing the goodness of nature to your family's everyday meals — in moderation.",
    image: "/images/use-salad.webp",
    imageAlt: "Bowl of fresh vegetable salad",
    sample: true,
    body: [
      {
        paragraphs: [
          "Fats are part of a balanced diet. Choosing minimally processed oils and using them in sensible amounts is one small part of eating well as a family.",
        ],
      },
      {
        heading: "Variety helps",
        paragraphs: [
          "Rotating between oils such as gingelly, groundnut and coconut brings different flavours to the table and avoids relying on a single source of fat.",
        ],
      },
      {
        heading: "A note on health advice",
        paragraphs: [
          "This article is general information, not medical advice. If you have a specific health condition or dietary requirement, please speak to a qualified doctor or dietitian.",
        ],
      },
    ],
  },
  {
    slug: "caring-for-hair-with-coconut-oil",
    title: "Traditional Hair Care with Coconut Oil",
    category: "Wellness",
    date: "2026-07-24",
    excerpt: "How families across South India have used coconut oil in their hair care routines.",
    image: "/images/use-skin.webp",
    imageAlt: "Coconut oil in a glass jar beside a split coconut",
    sample: true,
    body: [
      {
        paragraphs: [
          "Oiling hair with coconut oil is a long-standing tradition in many South Indian homes, often as part of a weekly routine.",
        ],
      },
      {
        heading: "A simple routine",
        list: [
          "Warm a small amount of oil by placing the bottle in warm water.",
          "Massage gently into the scalp and lengths.",
          "Leave on for a while, then wash with a mild shampoo.",
        ],
      },
      {
        paragraphs: ["Do a patch test first if you have sensitive skin, and stop use if irritation occurs."],
      },
    ],
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
export const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

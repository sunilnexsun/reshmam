/**
 * Blog article types, content parsing helper, and date formatting.
 * Dynamic articles are loaded from Firestore (`blogs` collection).
 */
export type BlogSection = {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  date: string; // ISO YYYY-MM-DD or full ISO timestamp
  excerpt: string;
  image: string;
  imageAlt: string;
  author?: string;
  htmlContent?: string;
  body: BlogSection[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
  };
  sample?: boolean;
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

/**
 * Parses Admin plain/markdown-like content text into structured storefront sections.
 * Headings start with `## `, bullet lists start with `- ` or `* `.
 */
export function parseBlogContent(raw: string): BlogSection[] {
  const text = String(raw || "").trim();
  if (!text) return [];
  const blocks = text.split(/\n{2,}/);
  const sections: BlogSection[] = [];
  let current: BlogSection = {};

  const flush = () => {
    if (current.heading || current.paragraphs?.length || current.list?.length) {
      sections.push(current);
      current = {};
    }
  };

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    if (lines[0].startsWith("## ")) {
      flush();
      current.heading = lines[0].slice(3).trim();
      const rest = lines.slice(1);
      if (rest.length) {
        const bullets = rest.filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
        const paras = rest.filter((l) => !/^[-*]\s+/.test(l));
        if (paras.length) current.paragraphs = [...(current.paragraphs || []), paras.join(" ")];
        if (bullets.length) current.list = [...(current.list || []), ...bullets];
      }
      continue;
    }

    const allBullets = lines.every((l) => /^[-*]\s+/.test(l));
    if (allBullets) {
      current.list = [...(current.list || []), ...lines.map((l) => l.replace(/^[-*]\s+/, ""))];
    } else {
      current.paragraphs = [...(current.paragraphs || []), lines.join(" ")];
    }
  }
  flush();
  return sections;
}

export const formatDate = (iso: string) => {
  const raw = String(iso || "").trim();
  if (!raw) return "";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const dt = new Date(normalized);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * Sanitizes rich-text blog HTML by stripping executable tags, event handlers,
 * unsafe protocols, and arbitrary inline styles while preserving formatting.
 */
export function sanitizeBlogHtml(rawHtml: string): string {
  const input = String(rawHtml || "").trim();
  if (!input) return "";

  let cleaned = input
    // Strip dangerous container elements completely
    .replace(/<(script|style|iframe|object|embed|form|noscript|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|meta|link|base)[^>]*\/?>/gi, "")
    // Strip inline event handlers like onclick="..."
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Strip dangerous href/src protocols
    .replace(/\b(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');

  // Keep only safe text-align inside style="..." attributes
  cleaned = cleaned.replace(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_m, dbl, sgl) => {
    const styleVal = String(dbl ?? sgl ?? "");
    const alignMatch = styleVal.match(/text-align\s*:\s*(left|center|right|justify)/i);
    return alignMatch ? ` style="text-align: ${alignMatch[1].toLowerCase()}"` : "";
  });

  return cleaned;
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Converts legacy structured `body` sections into clean HTML for the rich editor. */
export function bodyToHtml(body?: BlogSection[]): string {
  if (!Array.isArray(body) || !body.length) return "";
  return body
    .map((block) => {
      const parts: string[] = [];
      if (block.heading) parts.push(`<h2>${escapeHtml(block.heading)}</h2>`);
      if (Array.isArray(block.paragraphs)) {
        for (const p of block.paragraphs) {
          if (p) parts.push(`<p>${escapeHtml(p)}</p>`);
        }
      }
      if (Array.isArray(block.list) && block.list.length) {
        parts.push(
          `<ul>${block.list.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>`
        );
      }
      return parts.join("");
    })
    .filter(Boolean)
    .join("");
}

/** Extracts plain readable text from rich HTML (for excerpts, word count, CSV). */
export function htmlToPlainText(html: string): string {
  return String(html || "")
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/blockquote|\/figure)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

import "server-only";
import { cacheLife } from "next/cache";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseBlogContent, type BlogPost, type BlogSection } from "../blog";

export type Testimonial = {
  id: string;
  name: string;
  city: string;
  rating: number;
  quote: string;
  product?: string;
  avatar?: string;
  order?: number;
};

const DEFAULT_BLOG_IMAGE = "/images/blog-hero.webp";

function normalizeBlogImage(raw: unknown): string {
  const src = String(raw || "").trim();
  if (!src || src.startsWith("/images/blog/")) return DEFAULT_BLOG_IMAGE;
  return src;
}

function normalizeBody(rawBody: unknown, rawContent: unknown, excerpt: string): BlogSection[] {
  if (Array.isArray(rawBody) && rawBody.length > 0) {
    return rawBody
      .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
      .map((s) => ({
        ...(typeof s.heading === "string" && s.heading.trim() ? { heading: s.heading.trim() } : {}),
        ...(Array.isArray(s.paragraphs) && s.paragraphs.length
          ? { paragraphs: s.paragraphs.map(String).filter(Boolean) }
          : {}),
        ...(Array.isArray(s.list) && s.list.length
          ? { list: s.list.map(String).filter(Boolean) }
          : {}),
      }))
      .filter((s) => s.heading || s.paragraphs?.length || s.list?.length);
  }
  const parsed = parseBlogContent(String(rawContent || excerpt || ""));
  if (parsed.length > 0) return parsed;
  return excerpt ? [{ paragraphs: [excerpt] }] : [];
}

/**
 * Fetches published blog articles directly from Firestore (`blogs` collection).
 * Draft/Inactive articles are excluded from storefront rendering.
 */
export async function fetchDynamicBlogs(): Promise<BlogPost[]> {
  "use cache";
  cacheLife("seconds");
  try {
    const snap = await getDocs(collection(db, "blogs"));
    const items: BlogPost[] = [];

    for (const docSnap of snap.docs) {
      const d = docSnap.data() || {};
      const status = String(d.status || "Published").toLowerCase();
      if (status !== "published") continue;

      const title = String(d.title || "").trim();
      if (!title) continue;

      const slug = String(d.slug || docSnap.id).trim();
      const excerpt = String(d.excerpt || "").trim();
      const dateRaw = String(d.date || d.createdAt || new Date().toISOString().slice(0, 10));
      const date = dateRaw.length >= 10 ? dateRaw.slice(0, 10) : dateRaw;

      items.push({
        slug,
        title,
        category: String(d.category || "Oil Education"),
        date,
        excerpt,
        image: normalizeBlogImage(d.image || d.coverImage),
        imageAlt: String(d.imageAlt || title),
        author: d.author ? String(d.author) : undefined,
        body: normalizeBody(d.body, d.content, excerpt),
        sample: d.sample === true ? true : undefined,
      });
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.error("[Storefront] fetchDynamicBlogs error:", err);
    return [];
  }
}

export async function fetchDynamicBlogBySlug(slug: string): Promise<BlogPost | null> {
  "use cache";
  cacheLife("seconds");
  const all = await fetchDynamicBlogs();
  return all.find((p) => p.slug === slug) || null;
}

/**
 * Fetches active customer testimonials from Firestore (`testimonials` collection).
 */
export async function fetchDynamicTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheLife("seconds");
  try {
    const snap = await getDocs(collection(db, "testimonials"));
    const items: Testimonial[] = [];

    for (const docSnap of snap.docs) {
      const d = docSnap.data() || {};
      const status = String(d.status || "Active").toLowerCase();
      if (status !== "active") continue;

      const quote = String(d.quote || d.text || "").trim();
      if (!quote) continue;

      const ratingNum = Number(d.rating ?? 5);
      const rating = Number.isFinite(ratingNum) ? Math.min(5, Math.max(1, Math.round(ratingNum))) : 5;
      const orderNum = Number(d.order ?? 99);

      items.push({
        id: docSnap.id,
        name: String(d.name || "Customer").trim(),
        city: String(d.city || d.place || "").trim(),
        rating,
        quote,
        product: d.product ? String(d.product).trim() : undefined,
        avatar: d.avatar ? String(d.avatar).trim() : undefined,
        order: Number.isFinite(orderNum) ? orderNum : 99,
      });
    }

    return items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[Storefront] fetchDynamicTestimonials error:", err);
    return [];
  }
}

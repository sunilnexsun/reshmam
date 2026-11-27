import type { Metadata } from "next";
import { BannerHero } from "@storefront/_components/sections/BannerHero";
import { BlogCard, Breadcrumbs } from "@storefront/_components/sections/Misc";
import { ButtonLink, Container } from "@storefront/_components/ui/primitives";
import { fetchDynamicBlogs } from "@storefront/_lib/server/content";
import { openGraphBase } from "@storefront/_lib/site";

export const instant = false;

export const metadata: Metadata = {
  title: "Blog — Recipes, Tips & Wellness",
  description: "Cooking tips, oil education and wellness ideas from RESHMAM Natural Goodness.",
  alternates: { canonical: "/blog" },
  openGraph: { ...openGraphBase, url: "/blog", images: ["/images/blog-banner.webp"] },
};

export default async function BlogPage() {
  const posts = await fetchDynamicBlogs();
  return (
    <>
      <BannerHero
        src="/images/blog-banner.webp"
        width={1600}
        height={533}
        alt="Cold pressed oil poured from a wooden spoon over a bowl of sautéed vegetables, with groundnuts, sesame and coconut"
        eyebrow="From Our Blog"
        title="Recipes, Tips & Wellness"
        description="Ideas for cooking with traditional oils, how cold pressing works, and simple wellness habits."
        cta={{ href: "#posts-heading", label: "Explore Our Blog", box: { left: "6.6%", top: "76.4%", width: "16.8%", height: "9.6%" } }}
      />
      <section aria-labelledby="posts-heading" className="bg-paper py-12">
        <Container>
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Blog" }]} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 id="posts-heading" className="scroll-mt-28 font-serif text-3xl font-bold text-forest-800">
              Latest Articles
            </h2>
          </div>
          {posts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-beige-300/80 bg-white p-8 text-center shadow-card">
              <p className="font-serif text-xl font-bold text-forest-800">No articles published yet</p>
              <p className="mt-2 text-sm text-ink-soft">
                Publish articles from the admin panel to share cooking tips, oil education, and wellness notes here.
              </p>
              <div className="mt-5">
                <ButtonLink href="/products" variant="primary">
                  Browse Pure Oils
                </ButtonLink>
              </div>
            </div>
          ) : (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <li key={p.slug}>
                  <BlogCard post={p} layout="stack" />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}

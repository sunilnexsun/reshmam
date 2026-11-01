import type { Metadata } from "next";
import { PageHero, Gold } from "@storefront/_components/sections/PageHero";
import { BlogCard, Breadcrumbs } from "@storefront/_components/sections/Misc";
import { Container, SampleBadge } from "@storefront/_components/ui/primitives";
import { posts } from "@storefront/_lib/blog";

export const metadata: Metadata = {
  title: "Blog — Recipes, Tips & Wellness",
  description: "Cooking tips, oil education and wellness ideas from RESHMAM Natural Goodness.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="From Our Blog"
        title={
          <>
            Recipes, Tips <br />
            <Gold>&amp; Wellness</Gold>
          </>
        }
        description={<p>Ideas for cooking with traditional oils, how cold pressing works, and simple wellness habits.</p>}
        image="/images/health-meal.webp"
        imageAlt="Cold pressed oil poured over a bowl of sautéed vegetables"
      />
      <section aria-labelledby="posts-heading" className="bg-paper py-12">
        <Container>
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Blog" }]} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 id="posts-heading" className="font-serif text-3xl font-bold text-forest-800">
              Latest Articles
            </h2>
            <SampleBadge>Sample articles — to be replaced with approved content</SampleBadge>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <BlogCard post={p} layout="stack" />
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

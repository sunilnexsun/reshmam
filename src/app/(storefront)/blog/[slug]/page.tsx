import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BlogCard, Breadcrumbs, JsonLd } from "@storefront/_components/sections/Misc";
import { Container, SampleBadge } from "@storefront/_components/ui/primitives";
import { formatDate } from "@storefront/_lib/blog";
import { fetchDynamicBlogBySlug, fetchDynamicBlogs } from "@storefront/_lib/server/content";
import { absoluteUrl, openGraphBase } from "@storefront/_lib/site";

export async function generateStaticParams() {
  const posts = await fetchDynamicBlogs();
  return posts.map((p) => ({ slug: p.slug }));
}

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchDynamicBlogBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { ...openGraphBase, type: "article", url: `/blog/${post.slug}`, images: [post.image], publishedTime: post.date },
    robots: post.sample ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogArticle({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([
    fetchDynamicBlogBySlug(slug),
    fetchDynamicBlogs(),
  ]);
  if (!post) notFound();
  const related = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <article className="bg-paper py-10 sm:py-14">
        <Container className="max-w-3xl">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/blog", label: "Blog" }, { label: post.title }]} />
          <header className="mt-6">
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <span className="font-semibold uppercase tracking-wider text-rust">{post.category}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {post.sample && <SampleBadge>Sample article</SampleBadge>}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-forest-800 sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-lg text-ink-soft">{post.excerpt}</p>
          </header>
          <Image
            src={post.image}
            alt={post.imageAlt}
            width={984}
            height={364}
            unoptimized={post.image.startsWith("data:") || post.image.startsWith("http")}
            priority
            className="mt-8 aspect-[21/9] w-full rounded-2xl object-cover"
          />
          <div className="prose-reshmam mt-8 text-[17px] text-ink">
            {post.body.map((block, i) => (
              <section key={i}>
                {block.heading && <h2>{block.heading}</h2>}
                {block.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                {block.list && (
                  <ul>
                    {block.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </Container>
      </article>
      <section aria-labelledby="related-heading" className="bg-cream pb-16">
        <Container>
          <h2 id="related-heading" className="font-serif text-3xl font-bold text-forest-800">
            Related Posts
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <BlogCard post={p} layout="stack" />
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          datePublished: post.date,
          image: absoluteUrl(post.image),
          author: { "@type": "Organization", name: "RESHMAM" },
          mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BlogCard, Breadcrumbs, JsonLd } from "@storefront/_components/sections/Misc";
import { Container, SampleBadge } from "@storefront/_components/ui/primitives";
import { formatDate, sanitizeBlogHtml } from "@storefront/_lib/blog";
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
  const metaTitle = post.seo?.metaTitle || post.title;
  const metaDescription = post.seo?.metaDescription || post.excerpt;
  const keywords = post.seo?.focusKeyword || (post.tags?.length ? post.tags.join(", ") : undefined);
  return {
    title: metaTitle,
    description: metaDescription,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      ...openGraphBase,
      type: "article",
      title: metaTitle,
      description: metaDescription,
      url: `/blog/${post.slug}`,
      images: [post.image],
      publishedTime: post.date,
    },
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
              {post.author && (
                <>
                  <span aria-hidden>·</span>
                  <span>By {post.author}</span>
                </>
              )}
              {post.sample && <SampleBadge>Sample article</SampleBadge>}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-forest-800 sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-lg text-ink-soft">{post.excerpt}</p>
            {post.tags && post.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Article tags">
                {post.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-beige-300 bg-white px-3 py-0.5 text-xs font-medium text-forest-800"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </header>
          <Image
            src={post.image}
            alt={post.imageAlt}
            width={984}
            height={364}
            unoptimized={post.image.startsWith("data:") || post.image.startsWith("http")}
            priority
            sizes="(min-width:1024px) 984px, 100vw"
            // Uploaded banners come in any shape and often have text and products near the edges, so show the
            // whole image at its own proportions rather than cropping it to a fixed frame.
            className="mt-8 h-auto w-full rounded-2xl"
          />
          {post.htmlContent ? (
            <div
              className="prose-reshmam mt-8 text-[17px] text-ink"
              dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.htmlContent) }}
            />
          ) : (
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
          )}
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

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Quote } from "lucide-react";
import type { BlogPost } from "@storefront/_lib/blog";
import { formatDate } from "@storefront/_lib/blog";
import { absoluteUrl } from "@storefront/_lib/site";
import { ButtonLink, SampleBadge } from "@storefront/_components/ui/primitives";

/**
 * Testimonials — SAMPLE placeholders, clearly labelled until the business
 * supplies genuine customer reviews (with permission to publish them).
 */
const sampleTestimonials = [
  {
    name: "Sample Customer A",
    place: "Tamil Nadu",
    text: "Placeholder review: describe the taste and aroma the customer noticed in their everyday cooking.",
  },
  {
    name: "Sample Customer B",
    place: "Tamil Nadu",
    text: "Placeholder review: describe what made the customer choose traditionally extracted oils.",
  },
  {
    name: "Sample Customer C",
    place: "Tamil Nadu",
    text: "Placeholder review: describe the packaging and delivery experience.",
  },
];

export function Testimonials() {
  return (
    <div>
      <p className="mb-5 text-center">
        <SampleBadge>
          Sample testimonials — not verified customer reviews
        </SampleBadge>
      </p>
      <ul className="grid gap-5 md:grid-cols-3">
        {sampleTestimonials.map((t) => (
          <li
            key={t.name}
            className="relative flex gap-4 rounded-xl border border-beige-300/80 bg-white p-5 shadow-card"
          >
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-beige font-serif text-xl font-bold text-forest-800"
            >
              {t.name.slice(-1)}
            </span>
            <figure>
              <Quote className="h-5 w-5 text-gold" aria-hidden />
              <blockquote className="mt-1 text-sm italic leading-relaxed text-ink-soft">
                {t.text}
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-forest-900">
                {t.name}{" "}
                <span className="font-normal text-ink-soft">· {t.place}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlogCard({
  post,
  layout = "row",
}: {
  post: BlogPost;
  layout?: "row" | "stack";
}) {
  return (
    <article
      className={
        layout === "row"
          ? "group relative flex h-full gap-4 rounded-xl border border-beige-300/80 bg-white p-3 shadow-card"
          : "group relative flex h-full flex-col overflow-hidden rounded-xl border border-beige-300/80 bg-white shadow-card"
      }
    >
      <Image
        src={post.image}
        alt={post.imageAlt}
        width={376}
        height={124}
        sizes={layout === "row" ? "160px" : "(min-width:1024px) 33vw, 100vw"}
        className={
          layout === "row"
            ? "aspect-[4/3] w-32 shrink-0 rounded-lg object-cover sm:w-40"
            : "aspect-[16/8] w-full object-cover"
        }
      />
      <div
        className={
          layout === "row" ? "flex min-w-0 flex-col py-1" : "flex flex-1 flex-col p-5"
        }
      >
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className="font-semibold uppercase tracking-wider text-rust">
            {post.category}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.sample && <SampleBadge>Sample</SampleBadge>}
        </p>
        <h3 className="mt-1.5 font-sans text-[15px] font-semibold leading-snug text-forest-900 sm:text-base">
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 hover:underline underline-offset-4"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">
          {post.excerpt}
        </p>
        <span
          className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-forest-800"
          aria-hidden
        >
          Read More{" "}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: absoluteUrl(it.href) } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-ink-soft">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {it.href ? (
              <Link
                href={it.href}
                className="hover:text-forest-800 hover:underline"
              >
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-forest-900">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={ld} />
    </nav>
  );
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped so content can't break out of the script tag
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * Closing banner built from the supplied banner photography: the left and
 * right image pieces are pinned to the edges and fade into a warm centre
 * that holds the live heading and button.
 */
export function ClosingBanner({
  title,
  text,
  cta,
  banner,
}: {
  title: string;
  text: string;
  cta: { href: string; label: string };
  banner: {
    left: string;
    right: string;
    from: string;
    to: string;
    leftSize: [number, number];
    rightSize: [number, number];
  };
}) {
  const fadeRight = "linear-gradient(90deg,#000 70%,transparent)";
  const fadeLeft = "linear-gradient(270deg,#000 70%,transparent)";
  return (
    <section
      aria-labelledby="closing-heading"
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(90deg, ${banner.from}, ${banner.to})`,
      }}
    >
      <Image
        src={banner.left}
        alt=""
        width={banner.leftSize[0]}
        height={banner.leftSize[1]}
        className="absolute inset-y-0 left-0 hidden h-full w-auto max-w-[34%] object-cover object-left md:block"
        style={{ maskImage: fadeRight, WebkitMaskImage: fadeRight }}
      />
      <Image
        src={banner.right}
        alt=""
        width={banner.rightSize[0]}
        height={banner.rightSize[1]}
        className="absolute inset-y-0 right-0 hidden h-full w-auto max-w-[34%] object-cover object-right md:block"
        style={{ maskImage: fadeLeft, WebkitMaskImage: fadeLeft }}
      />
      <div className="relative mx-auto max-w-xl px-4 py-12 text-center text-white sm:py-14 md:max-w-[44%]">
        <h2
          id="closing-heading"
          className="font-serif text-3xl font-bold drop-shadow sm:text-4xl"
        >
          {title}
        </h2>
        <p className="mt-3 text-white/95 drop-shadow">{text}</p>
        <ButtonLink href={cta.href} variant="light" className="mt-6 px-7">
          {cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}

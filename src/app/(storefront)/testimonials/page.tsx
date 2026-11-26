import type { Metadata } from "next";
import { ArrowRight, Star } from "lucide-react";
import { PageHero, Gold } from "@storefront/_components/sections/PageHero";
import { BannerHero } from "@storefront/_components/sections/BannerHero";
import { Breadcrumbs, Testimonials } from "@storefront/_components/sections/Misc";
import { ButtonLink, Container } from "@storefront/_components/ui/primitives";
import { fetchDynamicTestimonials } from "@storefront/_lib/server/content";
import { openGraphBase } from "@storefront/_lib/site";

export const instant = false;

export const metadata: Metadata = {
  title: "Customer Testimonials — Real Kitchen Reviews",
  description:
    "Read honest stories and kitchen feedback from families using RESHMAM traditional wood-pressed oils.",
  alternates: { canonical: "/testimonials" },
  openGraph: {
    ...openGraphBase,
    url: "/testimonials",
    images: ["/images/testimonials-banner.webp"],
  },
};

export default async function TestimonialsPage() {
  const testimonials = await fetchDynamicTestimonials();
  const avgRating = testimonials.length
    ? (
        testimonials.reduce((sum, t) => sum + Number(t.rating || 5), 0) /
        testimonials.length
      ).toFixed(1)
    : null;

  return (
    <>
      <BannerHero
        src="/images/testimonials-banner.webp"
        width={1600}
        height={533}
        alt="RESHMAM cold pressed gingelly, coconut and groundnut oil bottles with sesame, coconut and groundnuts beside a wooden oil press"
        eyebrow="Customer Stories"
        title="What Our Customers Say"
        description="Real experiences from home kitchens and families who cook daily with Reshmam cold-pressed coconut, groundnut and gingelly oils."
        fallback={
          <PageHero
            eyebrow="Customer Stories"
            title={
              <>
                What Our <Gold>Customers Say</Gold>
              </>
            }
            description={
              <p>
                Honest experiences from home kitchens and families cooking daily with
                our cold wood-pressed gingelly, groundnut, and coconut oils.
              </p>
            }
            image="/images/blog-hero.webp"
            imageAlt="Cold wood-pressed oils prepared for traditional home cooking"
          />
        }
      />

      <section aria-labelledby="testimonials-list-heading" className="bg-paper py-12">
        <Container>
          <Breadcrumbs
            items={[{ href: "/", label: "Home" }, { label: "Testimonials" }]}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2
                id="testimonials-list-heading"
                className="font-serif text-3xl font-bold text-forest-800"
              >
                Verified Kitchen Reviews
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Managed dynamically from our customer feedback board.
              </p>
            </div>

            {avgRating && (
              <div className="inline-flex items-center gap-2 rounded-full border border-beige-300 bg-white px-4 py-2 text-sm font-semibold text-forest-900 shadow-card">
                <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
                <span>{avgRating} / 5.0</span>
                <span className="font-normal text-ink-soft">
                  ({testimonials.length}{" "}
                  {testimonials.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Testimonials
              items={testimonials}
              emptyText="No customer testimonials have been published yet. Check back soon!"
            />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-beige-300/80 bg-white p-6 shadow-card">
            <div>
              <h3 className="font-serif text-xl font-bold text-forest-900">
                Taste the Cold-Pressed Difference
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Explore fresh small-batch gingelly, groundnut, and coconut oils.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/products" variant="primary">
                Shop Pure Oils <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Share Your Feedback
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

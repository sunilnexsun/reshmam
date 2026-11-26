import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Cog,
  Droplets,
  Heart,
  HeartPulse,
  Leaf,
  Play,
  ShieldCheck,
  Sparkles,
  Truck,
  Wheat,
} from "lucide-react";
import { PageHero, Gold } from "./_components/sections/PageHero";
import { BannerHero } from "./_components/sections/BannerHero";
import { TrustStrip } from "./_components/sections/FeatureGrid";
import { ProductGrid } from "./_components/products/ProductCatalog";
import { BlogCard, Testimonials } from "./_components/sections/Misc";
import { AvailableOn } from "./_components/sections/AvailableOn";
import { ButtonLink, Container, Eyebrow, IconBadge, SectionHeading, LeafFlourish } from "./_components/ui/primitives";
import { LeafOutline, LeafSprig } from "./_components/ui/decor";
import { categories, getProduct, type Product } from "./_lib/products";
import { fetchDynamicProducts, fetchDynamicCategories } from "./_lib/server/catalogue";
import { splitBilingualName } from "./_lib/bilingual-name";
import { posts } from "./_lib/blog";
import { formatINR } from "./_lib/pricing";
import { site } from "./_lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export const instant = false;

export default async function HomePage() {
  const [dynamicProducts, dynamicCategories] = await Promise.all([
    fetchDynamicProducts(),
    fetchDynamicCategories(),
  ]);

  const categoriesList = dynamicCategories.length > 0 ? dynamicCategories : categories;
  const featured = dynamicProducts.filter((p) => p.bestseller);
  const bestsellersList = featured.length >= 2 ? featured.slice(0, 4) : dynamicProducts.slice(0, 4);
  return (
    <>
      <BannerHero
        src="/images/home-banner.webp"
        width={1600}
        height={666}
        alt="Bottles of RESHMAM groundnut, coconut and gingelly oil on a wooden board with groundnuts, sesame and coconut"
        eyebrow="Traditional | Natural | Pure"
        title="Tradition in Every Drop"
        description="Pure. Natural. Chemical Free. Traditionally extracted cold-pressed oils for your family's better health and well-being."
        overlay={
          // The banner has no drawn button, so a real one sits in the clear space under its icon row.
          <div className="absolute left-[32.3%] top-[78%] -translate-x-1/2">
            <ButtonLink href="/products" className="shadow-md">
              Shop Our Oils <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        }
        fallback={
          <PageHero
            eyebrow="Traditional | Natural | Pure"
            title={
              <>
                Tradition in <br />
                <Gold>Every Drop</Gold>
              </>
            }
            description={
              <>
                <p className="font-serif text-xl font-semibold text-forest-900 sm:text-2xl">Pure. Natural. Chemical Free.</p>
                <p className="mt-2 text-ink-soft">
                  Traditionally extracted cold-pressed oils for your family&apos;s better health and well-being.
                </p>
              </>
            }
            image="/images/home-banner-mobile.webp"
            imageAlt="Bottles of RESHMAM groundnut, coconut and gingelly oil on a wooden board with groundnuts, sesame and coconut"
            size="lg"
          >
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/products">
                Shop Our Oils <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/our-story" variant="outline">
                Explore Our Story
              </ButtonLink>
            </div>
          </PageHero>
        }
      />

      <TrustStrip
        items={[
          { icon: Leaf, title: "100% Natural", text: "Chemical free" },
          { icon: Cog, title: "Traditional", text: "Wooden chekku extraction" },
          { icon: Heart, title: "Rich in Nutrition", text: "Naturally good" },
          { icon: ShieldCheck, title: "Quality Assurance", text: "You can trust" },
          { icon: Truck, title: "Free Delivery", text: `Across Tamil Nadu above ${formatINR(site.shipping.freeThreshold)}` },
        ]}
      />

      {/* Shop by category */}
      <section aria-labelledby="cat-heading" className="bg-paper py-16">
        <Container>
          <SectionHeading eyebrow="Our Products" title={<span id="cat-heading">Shop by Category</span>} />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesList.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-beige-300/80 bg-cream-50 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <Image
                    src={c.image}
                    alt=""
                    width={464}
                    height={320}
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="aspect-[29/20] w-full bg-white object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="flex flex-1 flex-col p-5">
                    <CategoryName name={c.name} />
                    <span className="mt-1.5 text-sm text-ink-soft">{c.description}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-forest-800">
                      Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Our Story preview */}
      <section aria-labelledby="story-heading" className="relative overflow-hidden bg-beige/70">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.1fr_1fr_0.75fr]">
          <Link href="/our-story" className="group relative block min-h-72 lg:min-h-[440px]">
            <Image
              src="/images/story-hero.webp"
              alt="Traditional wooden chekku oil press filled with sesame seeds"
              fill
              sizes="(min-width:1024px) 40vw, 100vw"
              className="object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />
            <span className="absolute bottom-6 left-6 flex items-center gap-3 rounded-xl bg-black/45 p-3 pr-5 text-white backdrop-blur-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white">
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">Discover Our Story</span>
                <span className="text-xs text-white/85">How we bring nature&apos;s goodness to your home</span>
              </span>
            </span>
          </Link>
          <div className="px-4 py-12 sm:px-8 lg:py-16">
            <Eyebrow>Our Story</Eyebrow>
            <h2 id="story-heading" className="mt-2 font-serif text-3xl font-bold leading-tight text-forest-800 sm:text-4xl">
              Rooted in Tradition, Committed to Purity
            </h2>
            <LeafFlourish className="mt-2" />
            <p className="mt-4 leading-relaxed text-ink-soft">
              At RESHMAM, we bring you the goodness of traditionally extracted cold-pressed oils, made with care,
              quality and a deep respect for nature. Our oils are chemical-free, preservative-free and crafted for
              healthier living.
            </p>
            <ButtonLink href="/our-story" className="mt-6">
              Learn More About Us <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          {/* From lg up the four points fill the column's full height: equal rows, separated by dividers. */}
          <ul className="grid content-center gap-5 border-t border-beige-300 px-4 pb-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-1 lg:grid-rows-4 lg:content-stretch lg:gap-0 lg:divide-y lg:divide-beige-300 lg:border-l lg:border-t-0 lg:px-0 lg:py-0">
            {[
              { icon: Cog, t: "Traditional Extraction", d: "Using the wooden chekku method" },
              { icon: Leaf, t: "Pure & Natural", d: "No chemicals or preservatives" },
              { icon: Wheat, t: "Quality Ingredients", d: "Sourced from trusted farmers" },
              { icon: Heart, t: "Healthy Living", d: "Goodness for your family" },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex items-center gap-3 pt-4 lg:px-8 lg:py-6 xl:px-10">
                <IconBadge tone="gold" size="md">
                  <Icon className="h-5 w-5" />
                </IconBadge>
                <span>
                  <span className="block text-sm font-semibold text-forest-900">{t}</span>
                  <span className="text-xs text-ink-soft">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bestsellers */}
      <section aria-labelledby="best-heading" className="bg-paper py-16">
        <Container>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Our Products" title={<span id="best-heading">Our Bestsellers</span>} align="left" />
            <ButtonLink href="/products" variant="outline">
              View All Products <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="mt-8">
            <ProductGrid products={bestsellersList} />
          </div>
        </Container>
      </section>

      <AvailableOn />

      {/* Health preview */}
      <section aria-labelledby="health-heading" className="relative overflow-hidden bg-leaf-100/60">
        <LeafSprig className="absolute -left-8 top-4 hidden h-56 w-36 -rotate-12 md:block" />
        <LeafSprig flip className="absolute -right-12 -top-6 hidden h-44 w-28 rotate-12 xl:block" />
        <Container className="relative grid items-center gap-10 py-16 lg:grid-cols-[1fr_1.2fr]">
          <div className="lg:pl-16">
            <Eyebrow>Goodness for a</Eyebrow>
            <h2 id="health-heading" className="mt-1 font-serif text-4xl font-bold text-forest-800 sm:text-5xl">
              Healthier You
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Our cold-pressed oils keep the natural character of the seed — its aroma, colour and naturally occurring
              nutrients — making them a wholesome part of a balanced diet.
            </p>
            <ButtonLink href="/health-benefits" className="mt-6">
              Discover Health Benefits <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: HeartPulse, t: "Unsaturated Fats", d: "Naturally present in seed oils" },
              { icon: Droplets, t: "No Solvents", d: "Mechanically pressed" },
              { icon: Sparkles, t: "Natural Antioxidants", d: "Naturally occurring in sesame" },
              { icon: BadgeCheck, t: "Unrefined", d: "Natural aroma and colour" },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex flex-col items-center text-center">
                <IconBadge size="lg" className="h-20 w-20 border-forest-800/30 shadow-card">
                  <Icon className="h-8 w-8" strokeWidth={1.6} />
                </IconBadge>
                <span className="mt-3 text-sm font-semibold text-forest-900">{t}</span>
                <span className="mt-0.5 text-xs text-ink-soft">{d}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Testimonials */}
      <section aria-labelledby="testi-heading" className="relative overflow-hidden bg-paper py-16">
        <LeafOutline className="absolute left-2 top-8 h-40 w-28" />
        <Container className="relative">
          <SectionHeading eyebrow="Testimonials" title={<span id="testi-heading">What Our Customers Say</span>} />
          <div className="mt-8">
            <Testimonials />
          </div>
        </Container>
      </section>

      {/* Blog preview */}
      <section aria-labelledby="blog-heading" className="bg-cream pb-16">
        <Container>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="From Our Blog" title={<span id="blog-heading">Recipes, Tips &amp; Wellness</span>} align="left" />
            <ButtonLink href="/blog" variant="outline">
              View All Blog Posts <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <ul className="mt-8 grid gap-5 lg:grid-cols-3">
            {posts.slice(0, 3).map((p) => (
              <li key={p.slug}>
                <BlogCard post={p} />
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

/** English on the first line and the Tamil (written in brackets in the name) on the second. */
function CategoryName({ name }: { name: string }) {
  const { english, tamil } = splitBilingualName(name);
  return (
    <span className="font-serif text-xl font-bold text-forest-800">
      <span className="block">{english}</span>
      {tamil && (
        <span lang="ta" className="mt-1 block text-base">
          {tamil}
        </span>
      )}
    </span>
  );
}

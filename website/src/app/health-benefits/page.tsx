import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  ClipboardCheck,
  Cog,
  Droplets,
  FlaskConicalOff,
  HeartPulse,
  Leaf,
  Salad,
  Shield,
  Soup,
  Sparkles,
  Wheat,
  Flower2,
} from "lucide-react";
import { PageHero, Gold } from "@/components/sections/PageHero";
import { FeatureGrid, TrustStrip } from "@/components/sections/FeatureGrid";
import { ClosingBanner } from "@/components/sections/Misc";
import {
  ButtonLink,
  Container,
  IconBadge,
  SectionHeading,
  cn,
} from "@/components/ui/primitives";
import { LeafSprig } from "@/components/ui/decor";

export const metadata: Metadata = {
  title: "Health Benefits",
  description:
    "Why families choose cold pressed oils: natural nutrients, no chemical solvents and traditional extraction. Learn how to use gingelly, groundnut, coconut and castor oil.",
  alternates: { canonical: "/health-benefits" },
  openGraph: { url: "/health-benefits", images: ["/images/health-hero.webp"] },
};

const productBenefits = [
  {
    name: "Gingelly Oil (Sesame Oil)",
    image: "/images/product-gingelly.webp",
    alt: "RESHMAM gingelly oil with sesame seeds",
    href: "/products/gingelly-oil",
    points: [
      "Contains naturally occurring antioxidants such as sesamol",
      "A traditional choice for South Indian cooking",
      "Long used in traditional skin and hair care",
    ],
  },
  {
    name: "Groundnut Oil (Peanut Oil)",
    image: "/images/product-groundnut.webp",
    alt: "RESHMAM groundnut oil with groundnuts",
    href: "/products/groundnut-oil",
    points: [
      "Contains unsaturated fats",
      "Mild flavour suited to everyday cooking",
      "Traditionally used for frying and sautéing",
    ],
  },
  {
    name: "Coconut Oil",
    image: "/images/product-coconut.webp",
    alt: "RESHMAM coconut oil with a split coconut",
    href: "/products/coconut-oil",
    points: [
      "Suited to cooking and baking",
      "Distinctive natural aroma and flavour",
      "Traditionally used for skin and hair care",
    ],
  },
  {
    name: "Castor Oil",
    image: "/images/product-castor.webp",
    alt: "RESHMAM castor oil with castor seeds",
    href: "/products/castor-oil",
    external: true,
    points: [
      "Traditionally used for massage",
      "Used in hair and skin care routines",
      "For external use only — not a cooking oil",
    ],
  },
];

export default function HealthBenefitsPage() {
  return (
    <>
      <PageHero
        eyebrow="Health Benefits"
        title={
          <>
            Pure Oils <br />
            <Gold>for a Healthier You</Gold>
          </>
        }
        description={
          <p>
            Our cold-pressed oils are rich in natural nutrients, helping you and
            your family live a healthier, happier life.
          </p>
        }
        image="/images/health-hero.webp"
        imageAlt="RESHMAM gingelly, groundnut, coconut and castor oil bottles with seeds and coconut"
      >
        <ButtonLink href="#benefits">
          Explore Health Benefits <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </PageHero>

      <TrustStrip
        items={[
          {
            icon: HeartPulse,
            title: "Supports Heart Health",
            text: "As part of a balanced diet*",
          },
          {
            icon: Soup,
            title: "Aids Healthy Digestion",
            text: "Valued in traditional diets*",
          },
          {
            icon: Shield,
            title: "Rich in Natural Antioxidants",
            text: "Naturally occurring",
          },
          {
            icon: Sparkles,
            title: "Supports Immunity",
            text: "Through balanced nutrition*",
          },
          { icon: Leaf, title: "Good Fats", text: "For overall wellness" },
        ]}
      />

      {/* C. Benefits by product */}
      <section
        id="benefits"
        aria-labelledby="bp-heading"
        className="scroll-mt-28 bg-paper py-16"
      >
        <Container>
          <SectionHeading
            title={<span id="bp-heading">Benefits by Our Products</span>}
            subtitle="Each oil has its own natural character and traditional uses."
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {productBenefits.map((p) => (
              <li
                key={p.name}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border bg-cream-50 shadow-card",
                  p.external ? "border-rust/40" : "border-beige-300/80",
                )}
              >
                <Image
                  src={p.image}
                  alt={p.alt}
                  width={464}
                  height={320}
                  className="aspect-[29/20] w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-serif text-xl font-bold text-forest-800">
                    {p.name}
                  </h3>
                  {p.external && (
                    <p className="mt-2 flex items-start gap-2 rounded-md bg-rust/10 px-2.5 py-2 text-xs font-semibold text-rust">
                      <AlertTriangle
                        className="mt-px h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      External use only. Do not ingest or use as a treatment
                      without qualified medical guidance.
                    </p>
                  )}
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex gap-2">
                        <span
                          aria-hidden
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-600"
                        />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.href}
                    className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-forest-800 hover:underline"
                  >
                    Learn More <span className="sr-only">about {p.name}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* D. Goodness in every meal */}
      <section
        aria-labelledby="meal-heading"
        className="relative overflow-hidden bg-beige/60"
      >
        <LeafSprig
          flip
          className="absolute -right-8 -top-6 hidden h-48 w-32 rotate-12 lg:block"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1.1fr_0.8fr]">
          <Image
            src="/images/health-meal.webp"
            alt="Cold pressed oil being poured over a bowl of sautéed vegetables"
            width={516}
            height={268}
            className="h-full max-h-80 w-full object-cover"
          />
          <div className="px-4 sm:px-8 lg:px-0">
            <h2
              id="meal-heading"
              className="font-serif text-3xl font-bold text-forest-800 sm:text-4xl"
            >
              Goodness in Every Meal
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Add RESHMAM cold pressed oils to your everyday cooking — a spoon
              of gingelly oil in your tempering, groundnut oil for a weekday
              stir-fry, or coconut oil in a Kerala-style curry. Used in sensible
              amounts, they bring natural taste and aroma to a balanced family
              diet.
            </p>
          </div>
          <ul className="mx-4 mb-8 space-y-3 rounded-xl border border-beige-300 bg-white p-5 shadow-card sm:mx-8 lg:mx-0 lg:mb-0 lg:mr-8">
            {[
              { icon: Leaf, t: "Natural Nutrition" },
              { icon: FlaskConicalOff, t: "Chemical Free" },
              { icon: Cog, t: "Traditional Process" },
              { icon: Flower2, t: "Better Taste & Aroma" },
            ].map(({ icon: Icon, t }) => (
              <li
                key={t}
                className="flex items-center gap-3 text-sm font-semibold text-forest-900"
              >
                <IconBadge size="sm" tone="gold">
                  <Icon className="h-4 w-4" />
                </IconBadge>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* E. Why cold pressed */}
      <section aria-labelledby="why-cp-heading" className="bg-paper py-16">
        <Container>
          <SectionHeading
            title={
              <span id="why-cp-heading">Why Choose Cold-Pressed Oils?</span>
            }
            subtitle="Our cold-pressed oils are made with care, preserving the natural character of the ingredients."
          />
          <div className="mt-10">
            <FeatureGrid
              columns={6}
              items={[
                {
                  icon: Leaf,
                  title: "Natural Nutrients",
                  text: "Unrefined, so naturally occurring nutrients are retained.",
                },
                {
                  icon: FlaskConicalOff,
                  title: "No Chemical Solvents",
                  text: "Extracted mechanically, without solvents or additives.",
                },
                {
                  icon: Cog,
                  title: "Traditional Extraction",
                  text: "Time-tested wooden chekku pressing.",
                },
                {
                  icon: Droplets,
                  title: "Authentic Aroma and Taste",
                  text: "The natural flavour of the seed in every drop.",
                },
                {
                  icon: Wheat,
                  title: "Carefully Sourced Ingredients",
                  text: "Seeds and nuts from trusted farmers.",
                },
                {
                  icon: ClipboardCheck,
                  title: "Quality Checks",
                  text: "Every batch checked for purity and consistency.",
                },
              ]}
            />
          </div>
        </Container>
      </section>

      {/* F. Everyday usage ideas */}
      <section aria-labelledby="ways-heading" className="bg-cream pb-16">
        <Container>
          <SectionHeading
            title={
              <span id="ways-heading">
                Simple Ways to Enjoy Natural Goodness
              </span>
            }
            subtitle="Easy, everyday ways to include cold pressed oils in daily life."
          />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                image: "/images/use-cooking.webp",
                alt: "Idli served with sambar and chutney",
                icon: ChefHat,
                t: "Traditional Cooking",
                d: "Use gingelly or groundnut oil in your everyday South Indian dishes for authentic taste.",
              },
              {
                image: "/images/use-salad.webp",
                alt: "Fresh vegetable salad in a bowl",
                icon: Salad,
                t: "Healthy Salads",
                d: "Drizzle a teaspoon of cold pressed groundnut or gingelly oil over salads for a natural flavour boost.",
              },
              {
                image: "/images/use-skin.webp",
                alt: "Coconut oil in a glass jar beside a split coconut",
                icon: Sparkles,
                t: "Skin & Hair Care",
                d: "Use coconut or castor oil externally for traditional hair oiling and massage. Patch-test first.",
              },
            ].map(({ image, alt, icon: Icon, t, d }) => (
              <li
                key={t}
                className="overflow-hidden rounded-xl border border-beige-300/80 bg-cream-50 shadow-card"
              >
                <Image
                  src={image}
                  alt={alt}
                  width={376}
                  height={124}
                  className="aspect-[3/1] w-full object-cover"
                />
                <div className="flex gap-4 p-5">
                  <IconBadge tone="solid" size="md">
                    <Icon className="h-5 w-5" />
                  </IconBadge>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-forest-800">
                      {t}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {d}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-10 max-w-3xl rounded-lg border border-beige-300 bg-white/70 p-4 text-center text-xs leading-relaxed text-ink-soft">
            *This page provides general information about traditional uses of
            cold pressed oils and is not medical advice. Oils are a source of
            fat and are best used in moderation as part of a balanced diet. If
            you have a health condition, allergy (including to peanuts or
            sesame) or specific dietary needs, please consult a qualified doctor
            or dietitian.
          </p>
        </Container>
      </section>

      <ClosingBanner
        title="Bring Natural Goodness to Your Kitchen"
        text="Explore our range of pure, traditional cold pressed oils and make a healthier choice for your family."
        cta={{ href: "/products", label: "Explore Our Products" }}
        banner={{
          left: "/images/banner-health-left.webp",
          right: "/images/banner-health-right.webp",
          from: "#5d3411",
          to: "#8a5a24",
          leftSize: [555, 393],
          rightSize: [486, 393],
        }}
      />
    </>
  );
}

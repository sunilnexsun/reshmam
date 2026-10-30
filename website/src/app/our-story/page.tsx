import type { Metadata } from "next";
import {
  ClipboardCheck,
  Cog,
  HandHeart,
  Heart,
  Leaf,
  Recycle,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Wheat,
} from "lucide-react";
import { PageHero, Gold } from "@/components/sections/PageHero";
import { VideoPlayer, VideoSection } from "@/components/sections/VideoSection";
import {
  ImageCardGrid,
  JourneyTimeline,
  VisionMissionValues,
} from "@/components/sections/StorySections";
import { ClosingBanner } from "@/components/sections/Misc";
import {
  Container,
  Eyebrow,
  IconBadge,
  SectionHeading,
} from "@/components/ui/primitives";
import { LeafOutline, LeafSprig } from "@/components/ui/decor";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Rooted in tradition, nourishing generations. Learn how RESHMAM brings traditionally extracted wooden chekku cold-pressed oils to your home.",
  alternates: { canonical: "/our-story" },
  openGraph: { url: "/our-story", images: ["/images/story-hero.webp"] },
};

export default function OurStoryPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title={
          <>
            Rooted in Tradition, <br className="hidden sm:block" />
            <Gold>Nourishing Generations.</Gold>
          </>
        }
        description={
          <p>
            At RESHMAM, we bring you the goodness of traditionally extracted
            cold-pressed oils, made with care, purity and a deep respect for
            nature.
          </p>
        }
        image="/images/story-hero.webp"
        imageAlt="Wooden chekku oil press with sesame seeds, surrounded by greenery"
        script="Pure by Tradition, Made for Tomorrow"
        size="lg"
      />

      <div className="relative overflow-hidden bg-paper">
        <LeafSprig className="absolute -left-10 top-40 hidden h-56 w-36 rotate-[-30deg] xl:block" />
        <LeafOutline
          flip
          className="absolute -right-4 top-8 hidden h-48 w-36 lg:block"
        />
        <LeafOutline className="absolute -right-2 top-[420px] hidden h-40 w-28 lg:block" />

        {/* B. Our Process */}
        <VideoSection
          eyebrow="Our Process"
          title={
            <>
              Traditional Process <br className="hidden sm:block" />
              for Pure Goodness
            </>
          }
          headingId="process-heading"
          video={
            <VideoPlayer
              url={site.videos.process}
              poster="/images/video-process.webp"
              title="Our traditional extraction process"
              playAt={{ x: 49.2, y: 56.6 }}
            />
          }
        >
          <p>
            We follow time-tested traditional methods combined with modern
            hygiene standards. Seeds are pressed slowly in a wooden chekku, so
            the oil is extracted without chemical solvents and with minimal
            heat, keeping its natural aroma and flavour.
          </p>
          <p>
            From sourcing raw materials to the final packaging, each batch is
            cleaned, pressed, naturally settled, filtered and checked before it
            is bottled and sealed.
          </p>
          <ul className="grid grid-cols-2 gap-4 pt-3 sm:grid-cols-4">
            {[
              { icon: Leaf, t: "Traditional Extraction" },
              { icon: Heart, t: "Hygienic Process" },
              { icon: ShieldCheck, t: "Quality Monitoring" },
              { icon: Users, t: "Farm-to-Bottle Traceability" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex flex-col items-center text-center">
                <IconBadge size="md">
                  <Icon className="h-5 w-5" />
                </IconBadge>
                <span className="mt-2 text-xs font-semibold leading-tight text-forest-900">
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </VideoSection>

        {/* C. Our Story */}
        <VideoSection
          eyebrow="Our Story"
          title={
            <>
              A Journey of Purity <br className="hidden sm:block" />
              and Tradition
            </>
          }
          headingId="journey-heading"
          video={
            <VideoPlayer
              url={site.videos.story}
              poster="/images/video-story.webp"
              title="The RESHMAM story"
              playAt={{ x: 49.4, y: 61 }}
            />
          }
        >
          <p>
            RESHMAM was created to bring authentic, traditionally extracted
            cooking oils to families — oils pressed the way our grandparents
            knew them, without refining or chemical processing.
          </p>
          <p>
            We remain committed to the wooden chekku method, carefully chosen
            seeds and honest quality, so every bottle earns the trust of the
            families who use it.
          </p>
        </VideoSection>

        {/* D. Behind the Scenes */}
        <section aria-labelledby="bts-heading" className="py-12">
          <Container>
            <SectionHeading
              title={<span id="bts-heading">Behind the Scenes</span>}
              subtitle="Discover our process, meet our team, and see why RESHMAM oils are trusted by families across India."
            />
            <div className="mt-8">
              <ImageCardGrid
                cards={[
                  {
                    image: "/images/bts-extraction.webp",
                    alt: "Oil extraction machinery in the RESHMAM processing unit",
                    title: "Oil Extraction Process",
                    text: "Our traditional cold-press method that preserves natural goodness.",
                  },
                  {
                    image: "/images/bts-farm.webp",
                    alt: "Seeds drying in the sun on an open yard",
                    title: "Farm to Bottle Journey",
                    text: "Premium ingredients journey from farm to your kitchen table.",
                  },
                  {
                    image: "/images/bts-quality.webp",
                    alt: "Freshly pressed oil flowing through the filtering stage",
                    title: "Quality Control Process",
                    text: "How we ensure every bottle meets our high standards.",
                  },
                ]}
              />
            </div>
          </Container>
        </section>

        {/* E. Vision, Mission, Values */}
        <section aria-label="Vision, mission and values" className="pb-12">
          <Container>
            <VisionMissionValues
              vision="To be a trusted brand that brings pure, natural and nutritious cold-pressed oils to every home, and promotes a healthier, happier society."
              mission="To deliver high-quality, traditionally extracted oils that support the health and well-being of our customers, while empowering farmers and preserving our traditional practices."
              values={[
                "Purity and Authenticity",
                "Health and Wellness",
                "Tradition and Heritage",
                "Sustainability",
                "Trust and Transparency",
                "Care for Our Community",
              ]}
            />
          </Container>
        </section>

        {/* F. Our Journey */}
        <section
          aria-labelledby="roots-heading"
          className="border-t border-beige-300/70 bg-beige/40 py-14"
        >
          <Container>
            <SectionHeading
              eyebrow="Our Journey"
              title={
                <span id="roots-heading">From Our Roots to Your Home</span>
              }
              subtitle="A journey of purity, tradition and trust — bringing the goodness of nature to every generation."
            />
            <div className="mt-10">
              <JourneyTimeline
                steps={[
                  {
                    icon: Sprout,
                    title: "Our Roots",
                    text: "Inspired by traditional practices and family wisdom.",
                  },
                  {
                    icon: Wheat,
                    title: "Sourcing",
                    text: "Partnering with trusted farmers for quality seeds.",
                  },
                  {
                    icon: Cog,
                    title: "Traditional Extraction",
                    text: "Using wooden chekku to retain natural goodness.",
                  },
                  {
                    icon: ClipboardCheck,
                    title: "Quality Assurance",
                    text: "Careful checks for purity and freshness.",
                  },
                  {
                    icon: Users,
                    title: "Your Family",
                    text: "Delivering wholesome, flavourful oils to your home.",
                  },
                ]}
              />
            </div>
          </Container>
        </section>

        {/* G. Why RESHMAM */}
        <section aria-labelledby="why-heading" className="py-14">
          <Container className="grid items-center gap-8 lg:grid-cols-[0.9fr_2fr]">
            <div>
              <Eyebrow>Why RESHMAM</Eyebrow>
              <h2
                id="why-heading"
                className="mt-1 font-serif text-3xl font-bold text-forest-800 sm:text-4xl"
              >
                Goodness You Can Trust
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                We are committed to delivering pure, natural and high quality
                cold-pressed oils that support your family&apos;s everyday
                cooking and a healthier planet.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Leaf,
                  t: "Pure Ingredients",
                  d: "No chemicals or additives",
                },
                {
                  icon: Cog,
                  t: "Authentic Process",
                  d: "Traditional wooden chekku",
                },
                {
                  icon: ShieldCheck,
                  t: "Quality Assured",
                  d: "Carefully checked batches",
                },
                {
                  icon: Recycle,
                  t: "Sustainable Choice",
                  d: "Respect for nature",
                },
                {
                  icon: HandHeart,
                  t: "Supports Farmers",
                  d: "Fair partnerships",
                },
                {
                  icon: Sparkles,
                  t: "Naturally Nutritious",
                  d: "Unrefined goodness",
                },
              ].map(({ icon: Icon, t, d }) => (
                <li
                  key={t}
                  className="flex items-center gap-3 rounded-xl border border-beige-300/80 bg-cream-50 p-4"
                >
                  <IconBadge size="md">
                    <Icon className="h-5 w-5" />
                  </IconBadge>
                  <span>
                    <span className="block text-sm font-semibold text-forest-900">
                      {t}
                    </span>
                    <span className="text-xs text-ink-soft">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      </div>

      <ClosingBanner
        title="Join Us in a Healthier Tomorrow"
        text="Choose RESHMAM and bring home the natural goodness of tradition."
        cta={{ href: "/products", label: "Explore Our Products" }}
        banner={{
          left: "/images/banner-story-left.webp",
          right: "/images/banner-story-right.webp",
          from: "#5f3a12",
          to: "#9a6522",
          leftSize: [618, 360],
          rightSize: [618, 360],
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { FlaskConicalOff, Heart, Leaf, Users } from "lucide-react";
import { PageHero, Gold } from "@storefront/_components/sections/PageHero";
import { BannerHero } from "@storefront/_components/sections/BannerHero";
import { openGraphBase } from "@storefront/_lib/site";
import { ProductCatalog, ProductCatalogFallback } from "@storefront/_components/products/ProductCatalog";
import { BulkOrderSection } from "@storefront/_components/products/BulkOrderSection";
import { Breadcrumbs } from "@storefront/_components/sections/Misc";
import { Container, IconBadge } from "@storefront/_components/ui/primitives";

export const metadata: Metadata = {
  title: "Shop Cold Pressed Oils",
  description:
    "Shop RESHMAM traditional cold pressed gingelly, groundnut and coconut oils, family packs and gift combos. Free delivery across Tamil Nadu above ₹1,499.",
  alternates: { canonical: "/products" },
  openGraph: { ...openGraphBase, type: "website", url: "/products", images: ["/images/products-banner.webp"] },
};

export default function ProductsPage() {
  return (
    <>
      <BannerHero
        src="/images/products-banner.webp"
        width={1600}
        height={552}
        alt="RESHMAM gingelly, coconut and groundnut oil bottles with sesame, coconut and groundnuts"
        eyebrow="Our Products"
        title="Natural Goodness for Your Everyday Cooking"
        description="Explore our range of traditionally extracted cold pressed oils, made with pure ingredients and no chemicals."
        fallback={
          <PageHero
            eyebrow="Our Products"
            title={
              <>
                Natural Goodness <br />
                <Gold>for Your</Gold> Everyday Cooking
              </>
            }
            description={
              <p>
                Explore our range of traditionally extracted cold pressed oils, made with pure ingredients and no
                chemicals.
              </p>
            }
            image="/images/products-banner-mobile.webp"
            imageAlt="RESHMAM gingelly, coconut and groundnut oil bottles with sesame, coconut and groundnuts"
          >
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-5">
              {[
                { icon: Leaf, t: "100% Natural", s: "Cold Pressed" },
                { icon: FlaskConicalOff, t: "No Chemicals", s: "or Additives" },
                { icon: Heart, t: "Rich in", s: "Natural Nutrients" },
                { icon: Users, t: "Good for", s: "Your Family" },
              ].map(({ icon: Icon, t, s }) => (
                <li key={t} className="flex items-center gap-2 text-xs leading-tight">
                  <IconBadge size="sm">
                    <Icon className="h-4 w-4" />
                  </IconBadge>
                  <span className="text-forest-900">
                    {t}
                    <br />
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </PageHero>
        }
      />

      <section aria-label="Product catalogue" className="bg-paper py-10 sm:py-12">
        <Container>
          <div className="mb-6">
            <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Products" }]} />
          </div>
          <h2 className="sr-only">All products</h2>
          <Suspense fallback={<ProductCatalogFallback />}>
            <ProductCatalog />
          </Suspense>
        </Container>
      </section>

      <BulkOrderSection />
    </>
  );
}

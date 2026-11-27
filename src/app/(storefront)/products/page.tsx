import type { Metadata } from "next";
import { Suspense } from "react";
import { BannerHero } from "@storefront/_components/sections/BannerHero";
import { openGraphBase } from "@storefront/_lib/site";
import { ProductCatalog, ProductCatalogFallback } from "@storefront/_components/products/ProductCatalog";
import { BulkOrderSection } from "@storefront/_components/products/BulkOrderSection";
import { Breadcrumbs } from "@storefront/_components/sections/Misc";
import { Container } from "@storefront/_components/ui/primitives";
import { fetchDynamicProducts, fetchDynamicCategories, fetchDynamicBranches } from "@storefront/_lib/server/catalogue";

export const metadata: Metadata = {
  title: "Shop Cold Pressed Oils & Natural Products",
  description:
    "Shop RESHMAM traditional cold pressed gingelly, groundnut and coconut oils, cattle feeds and gift combos. Free delivery across Tamil Nadu above ₹1,499.",
  alternates: { canonical: "/products" },
  openGraph: { ...openGraphBase, type: "website", url: "/products", images: ["/images/products-banner.webp"] },
};

export const instant = false;

export default async function ProductsPage() {
  const [products, categories, branches] = await Promise.all([
    fetchDynamicProducts(),
    fetchDynamicCategories(),
    fetchDynamicBranches(),
  ]);

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
      />

      <section aria-label="Product catalogue" className="bg-paper py-10 sm:py-12">
        <Container>
          <div className="mb-6">
            <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Products" }]} />
          </div>
          <h2 className="sr-only">All products</h2>
          <Suspense fallback={<ProductCatalogFallback />}>
            <ProductCatalog
              initialProducts={products}
              initialCategories={categories}
              initialBranches={branches}
            />
          </Suspense>
        </Container>
      </section>

      <BulkOrderSection />
    </>
  );
}

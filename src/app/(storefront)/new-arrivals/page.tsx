import type { Metadata } from "next";
import { ProductGrid } from "@storefront/_components/products/ProductCatalog";
import { PageBanner } from "@storefront/_components/sections/PageBanner";
import { ButtonLink, Container } from "@storefront/_components/ui/primitives";
import { fetchDynamicProducts } from "@storefront/_lib/server/catalogue";

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "The latest additions to the Reshmam range of traditional cold pressed oils.",
  alternates: { canonical: "/new-arrivals" },
};

export const instant = false;

export default async function NewArrivalsPage() {
  const products = await fetchDynamicProducts();
  const list = products.filter((p) => p.newArrival || p.bestseller);

  return (
    <>
      <PageBanner
        eyebrow="Just added"
        title="New Arrivals"
        intro="The latest additions to the RESHMAM range of cold pressed oils."
        crumbs={[{ href: "/", label: "Home" }, { href: "/products", label: "Shop" }, { label: "New Arrivals" }]}
      />
      <section className="bg-paper py-10">
        <Container>
          {list.length ? (
            <ProductGrid products={list} />
          ) : (
            <p className="text-ink-soft">New products are on their way. Browse our full range in the meantime.</p>
          )}
          <div className="mt-10 text-center">
            <ButtonLink href="/products" variant="outline">
              View All Products
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}

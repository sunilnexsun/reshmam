import type { Metadata } from "next";
import { ProductGrid } from "@storefront/_components/products/ProductCatalog";
import { PageBanner } from "@storefront/_components/sections/PageBanner";
import { ButtonLink, Container } from "@storefront/_components/ui/primitives";
import { products } from "@storefront/_lib/products";

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "The latest additions to the Reshmam range of traditional oils and oil cake cattle feed.",
  alternates: { canonical: "/new-arrivals" },
};

export default function NewArrivalsPage() {
  const list = products.filter((p) => p.newArrival);
  return (
    <>
      <PageBanner
        eyebrow="Just added"
        title="New Arrivals"
        intro="The latest additions to our range from the Velum Mayilum and Reshmam branches."
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

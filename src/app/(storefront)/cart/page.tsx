import type { Metadata } from "next";
import { CartView } from "@storefront/_components/cart/CartView";
import { PageBanner } from "@storefront/_components/sections/PageBanner";
import { Container } from "@storefront/_components/ui/primitives";

export const metadata: Metadata = { title: "Your Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageBanner title="Your Cart" crumbs={[{ href: "/", label: "Home" }, { label: "Cart" }]} />
      <section className="bg-paper py-10">
        <Container>
          <CartView />
        </Container>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { PageBanner } from "@/components/sections/PageBanner";
import { Container } from "@/components/ui/primitives";

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

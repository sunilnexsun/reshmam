import type { Metadata } from "next";
import { CheckoutForm } from "@storefront/_components/cart/CheckoutForm";
import { PageBanner } from "@storefront/_components/sections/PageBanner";
import { Container } from "@storefront/_components/ui/primitives";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageBanner
        title="Checkout"
        crumbs={[{ href: "/", label: "Home" }, { href: "/cart", label: "Cart" }, { label: "Checkout" }]}
      />
      <section className="bg-paper py-10">
        <Container>
          <CheckoutForm />
        </Container>
      </section>
    </>
  );
}

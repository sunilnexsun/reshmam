import type { Metadata } from "next";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { PageBanner } from "@/components/sections/PageBanner";
import { Container } from "@/components/ui/primitives";

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

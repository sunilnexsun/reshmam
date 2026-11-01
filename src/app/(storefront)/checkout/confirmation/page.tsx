import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@storefront/_components/cart/OrderStatus";
import { PageBanner } from "@storefront/_components/sections/PageBanner";
import { Container } from "@storefront/_components/ui/primitives";

export const metadata: Metadata = { title: "Order Confirmation", robots: { index: false } };

export default function ConfirmationPage() {
  return (
    <>
      <PageBanner title="Order Confirmation" crumbs={[{ href: "/", label: "Home" }, { label: "Order Confirmation" }]} />
      <section className="bg-paper py-10">
        <Container className="max-w-3xl">
          <Suspense fallback={<p className="text-ink-soft">Loading your order…</p>}>
            <OrderConfirmation />
          </Suspense>
        </Container>
      </section>
    </>
  );
}

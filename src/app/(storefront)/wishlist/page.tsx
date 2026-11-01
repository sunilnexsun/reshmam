import type { Metadata } from "next";
import { WishlistView } from "@storefront/_components/products/WishlistView";
import { PageBanner } from "@storefront/_components/sections/PageBanner";
import { Container } from "@storefront/_components/ui/primitives";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <>
      <PageBanner title="Your Wishlist" crumbs={[{ href: "/", label: "Home" }, { label: "Wishlist" }]} />
      <section className="bg-paper py-10">
        <Container>
          <WishlistView />
        </Container>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { WishlistView } from "@/components/products/WishlistView";
import { PageBanner } from "@/components/sections/PageBanner";
import { Container } from "@/components/ui/primitives";

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

import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/AccountPanel";
import { PageBanner } from "@/components/sections/PageBanner";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

export default function AccountPage() {
  return (
    <>
      <PageBanner title="My Account" crumbs={[{ href: "/", label: "Home" }, { label: "My Account" }]} />
      <section className="bg-paper py-10">
        <Container className="max-w-4xl">
          <AccountPanel />
        </Container>
      </section>
    </>
  );
}

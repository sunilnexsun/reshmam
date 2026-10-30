import type { ReactNode } from "react";
import { Breadcrumbs } from "./Misc";
import { Container, Eyebrow } from "../ui/primitives";
import { LeafSprig } from "../ui/decor";
import { site, whatsappUrl } from "@/lib/site";

/** Compact banner used for utility pages (cart, checkout, policies, account). */
export function PageBanner({
  eyebrow,
  title,
  intro,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  crumbs: { href?: string; label: string }[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-beige-300/70 bg-beige/60">
      <LeafSprig flip className="absolute -right-6 -top-4 hidden h-40 w-28 rotate-[20deg] sm:block" />
      <Container className="relative py-10">
        <Breadcrumbs items={crumbs} />
        {eyebrow && <Eyebrow className="mt-5">{eyebrow}</Eyebrow>}
        <h1 className="mt-2 font-serif text-4xl font-bold text-forest-800 sm:text-5xl">{title}</h1>
        {intro && <div className="mt-3 max-w-2xl text-ink-soft">{intro}</div>}
      </Container>
    </section>
  );
}

export function SupportBox() {
  return (
    <aside className="mt-6 rounded-2xl border border-beige-300 bg-beige/50 p-6">
      <h2 className="font-serif text-xl font-bold text-forest-800">Need help?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Contact our customer support team at{" "}
        <a href={`mailto:${site.emails.info}`} className="font-semibold text-forest-800 underline">
          {site.emails.info}
        </a>
        , call{" "}
        <a href={`tel:${site.phone.tel}`} className="font-semibold text-forest-800 underline">
          {site.phone.display}
        </a>
        , or{" "}
        <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-800 underline">
          chat with us on WhatsApp
        </a>
        .
      </p>
    </aside>
  );
}

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { site } from "@storefront/_lib/site";
import { Container, SectionHeading } from "@storefront/_components/ui/primitives";

/**
 * "Also available on" strip listing the marketplaces RESHMAM sells on (site.marketplaces).
 * Shows each store's logo once one is configured, otherwise its name.
 */
export function AvailableOn() {
  const stores = site.marketplaces;
  if (stores.length === 0) return null;
  return (
    <section aria-labelledby="available-heading" className="bg-cream py-14">
      <Container>
        <SectionHeading
          eyebrow="Shop Anywhere"
          title={<span id="available-heading">Also Available On</span>}
          subtitle="Find RESHMAM cold pressed oils on your favourite shopping and quick-delivery apps."
        />
        <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stores.map((m) => {
            const live = m.url && m.url !== "#";
            const body = m.logo ? (
              <Image src={m.logo} alt={m.name} width={140} height={48} className="h-10 w-auto object-contain" />
            ) : (
              <span className="flex items-center gap-2 font-serif text-lg font-bold text-forest-800">
                <ShoppingBag className="h-5 w-5 text-rust" aria-hidden />
                {m.name}
              </span>
            );
            const tile =
              "flex h-20 items-center justify-center rounded-xl border border-beige-300/80 bg-white px-4 text-center shadow-card";
            return (
              <li key={m.name}>
                {live ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Buy RESHMAM on ${m.name}`}
                    className={`${tile} transition-shadow hover:shadow-card-hover`}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={tile}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

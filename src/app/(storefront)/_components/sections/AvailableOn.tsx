import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { site } from "@storefront/_lib/site";
import { Container, SectionHeading } from "@storefront/_components/ui/primitives";

/**
 * "Also available on" strip listing the marketplaces RESHMAM sells on (site.marketplaces).
 * Shows each store's logo (with a text label where the logo alone doesn't name the store), otherwise its name.
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
              <span className="flex flex-col items-center gap-1.5">
                {/* Logo files are 120 px tall; 24 px (32 px from lg up), with any label stacked below. */}
                <Image
                  src={m.logo}
                  // With a label, the image only names what the label doesn't (Swiggy + "Instamart"; JioMart's icon adds nothing).
                  alt={m.label ? m.name.replace(m.label, "").trim() : m.name}
                  width={m.width ?? 120}
                  height={120}
                  className="h-6 w-auto object-contain lg:h-8"
                />
                {m.label && <span className="text-sm font-bold leading-none text-ink lg:text-base">{m.label}</span>}
              </span>
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

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * Page hero built from a designed banner image whose heading and button are part of the artwork.
 *
 * - From lg up the banner is shown as is. The real heading and intro stay in the page (visually hidden) for
 *   screen readers and search engines, and an invisible link is placed over the drawn button.
 * - Below lg the banner's text would be too small to read, so `fallback` (usually a PageHero using the
 *   product side of the banner) is shown instead.
 * - `overlay` adds real, clickable elements on top of the banner (position them absolutely in % of the banner).
 */
export function BannerHero({
  src,
  width,
  height,
  alt,
  eyebrow,
  title,
  description,
  cta,
  overlay,
  fallback,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Where the drawn button links, and its box as percentages of the banner. */
  cta?: { href: string; label: string; box: Pick<CSSProperties, "left" | "top" | "width" | "height"> };
  overlay?: ReactNode;
  fallback: ReactNode;
}) {
  return (
    <>
      <section className="relative hidden bg-cream lg:block">
        <Image src={src} alt={alt} width={width} height={height} priority sizes="100vw" className="h-auto w-full" />
        <div className="sr-only">
          {eyebrow && <p>{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {cta && (
          <Link
            href={cta.href}
            aria-label={cta.label}
            className="absolute rounded-lg focus-visible:outline-offset-4"
            style={cta.box}
          />
        )}
        {overlay}
      </section>
      <div className="lg:hidden">{fallback}</div>
    </>
  );
}

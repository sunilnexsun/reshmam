import Image from "next/image";
import type { ReactNode } from "react";
import { Eyebrow, cn } from "@storefront/_components/ui/primitives";
import { LeafSprig } from "@storefront/_components/ui/decor";

/**
 * Shared hero used across pages: copy on the left over warm cream, product
 * or process photography on the right, with botanical sprigs at the edges.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  children,
  imagePosition = "center",
  badge,
  script,
  size = "md",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  image: string;
  imageAlt: string;
  children?: ReactNode;
  imagePosition?: string;
  badge?: boolean;
  /** handwritten-style accent line shown over the image (e.g. "Pure by Tradition") */
  script?: string;
  size?: "md" | "lg";
}) {
  return (
    <section className="relative overflow-hidden bg-cream">
      {/* Image — stacked on mobile, right side on desktop */}
      <div className="relative h-60 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[60%]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="(min-width:1024px) 60vw, 100vw"
          className="object-cover"
          style={{ objectPosition: imagePosition }}
        />
        <div className="hero-fade absolute inset-0" aria-hidden />
        {badge && (
          <div
            aria-hidden
            className="absolute right-4 top-4 hidden h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-gold/70 bg-forest-800 text-center text-white shadow-lg sm:flex lg:right-8 lg:top-8 lg:h-28 lg:w-28"
          >
            <span className="font-serif text-2xl font-bold leading-none">100%</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Natural</span>
            <span className="mt-0.5 px-3 text-[8px] uppercase leading-tight tracking-wide text-white/80">Cold pressed goodness</span>
          </div>
        )}
        {script && (
          <p
            aria-hidden
            className="absolute right-6 top-6 hidden max-w-[11rem] -rotate-12 text-right font-serif text-2xl italic leading-tight text-rust/90 xl:block"
          >
            {script}
          </p>
        )}
      </div>
      <LeafSprig className="absolute -left-10 top-6 hidden h-48 w-32 rotate-[-25deg] lg:block" />
      <LeafSprig className="absolute -left-12 bottom-0 hidden h-56 w-36 rotate-[200deg] opacity-90 lg:block" />
      <div
        className={cn(
          "relative mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:flex lg:items-center lg:px-8 lg:pb-0 lg:pt-0",
          size === "lg" ? "lg:min-h-[480px]" : "lg:min-h-[400px]",
        )}
      >
        <div className="max-w-xl -mt-12 rounded-2xl bg-cream/95 p-5 sm:-mt-16 sm:p-6 lg:mt-0 lg:bg-transparent lg:p-0 lg:py-14 lg:pl-6 xl:pl-10">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="mt-2 font-serif text-4xl font-bold leading-[1.08] text-forest-800 sm:text-5xl xl:text-[3.6rem]">
            {title}
          </h1>
          {description && <div className="mt-4 text-base leading-relaxed text-ink sm:text-lg">{description}</div>}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export const Gold = ({ children }: { children: ReactNode }) => <span className="text-gold-700">{children}</span>;

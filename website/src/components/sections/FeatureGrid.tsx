import type { LucideIcon } from "lucide-react";
import { IconBadge, cn } from "../ui/primitives";

export type Feature = { icon: LucideIcon; title: string; text?: string };

/** Horizontal strip of icon + label pairs (trust strip / benefit highlights). */
export function TrustStrip({ items, className }: { items: Feature[]; className?: string }) {
  return (
    <section aria-label="Why customers trust RESHMAM" className={cn("border-y border-beige-300/80 bg-white", className)}>
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <IconBadge size="md">
              <Icon className="h-5 w-5" />
            </IconBadge>
            <span className="text-[13px] leading-snug">
              <span className="block font-semibold text-forest-900">{title}</span>
              {text && <span className="text-ink-soft">{text}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Grid of feature cards with a centered icon, title and short description. */
export function FeatureGrid({
  items,
  columns = 6,
  variant = "card",
}: {
  items: Feature[];
  columns?: 3 | 4 | 5 | 6;
  variant?: "card" | "plain";
}) {
  const cols = {
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
    6: "sm:grid-cols-3 lg:grid-cols-6",
  }[columns];
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4", cols)}>
      {items.map(({ icon: Icon, title, text }) => (
        <li
          key={title}
          className={cn(
            "flex flex-col items-center px-3 py-5 text-center",
            variant === "card" && "rounded-xl border border-beige-300/80 bg-cream-50 shadow-card",
          )}
        >
          <IconBadge size="lg" tone="outline" className="border-leaf-600/60 text-forest-800">
            <Icon className="h-7 w-7" strokeWidth={1.6} />
          </IconBadge>
          <h3 className="mt-3 font-sans text-sm font-semibold text-forest-900">{title}</h3>
          {text && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{text}</p>}
        </li>
      ))}
    </ul>
  );
}

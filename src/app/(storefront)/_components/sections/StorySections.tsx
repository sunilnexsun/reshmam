import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Check, Eye, Gem, Target } from "lucide-react";
import { IconBadge } from "@storefront/_components/ui/primitives";
import { LeafOutline } from "@storefront/_components/ui/decor";

export function VisionMissionValues({
  vision,
  mission,
  values,
}: {
  vision: string;
  mission: string;
  values: string[];
}) {
  const cards: { icon: LucideIcon; title: string; body: React.ReactNode }[] = [
    { icon: Eye, title: "Our Vision", body: <p>{vision}</p> },
    { icon: Target, title: "Our Mission", body: <p>{mission}</p> },
    {
      icon: Gem,
      title: "Our Values",
      body: (
        <ul className="space-y-1">
          {values.map((v) => (
            <li key={v} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-800" strokeWidth={3} aria-hidden />
              {v}
            </li>
          ))}
        </ul>
      ),
    },
  ];
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {cards.map(({ icon: Icon, title, body }) => (
        <li
          key={title}
          className="relative flex gap-5 overflow-hidden rounded-xl border border-beige-300 bg-beige/60 p-6"
        >
          <LeafOutline className="absolute -bottom-6 left-2 h-24 w-20" />
          <IconBadge tone="solid" size="lg" className="relative mt-1 h-16 w-16 shadow-md">
            <Icon className="h-8 w-8" strokeWidth={1.8} />
          </IconBadge>
          <div className="relative text-[14px] leading-relaxed text-ink-soft">
            <h3 className="mb-2 font-sans text-sm font-bold uppercase tracking-[0.15em] text-rust">{title}</h3>
            {body}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function JourneyTimeline({ steps }: { steps: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <ol className="relative grid gap-6 md:grid-cols-5 md:gap-4">
      {/* connector line */}
      <span aria-hidden className="absolute bottom-6 left-6 top-6 w-px border-l-2 border-dashed border-gold/60 md:bottom-auto md:left-[10%] md:right-[10%] md:top-7 md:h-px md:w-auto md:border-l-0 md:border-t-2" />
      {steps.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="relative flex items-start gap-4 md:flex-col md:items-center md:text-center">
          <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-cream bg-forest-800 text-white shadow-md">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="pt-1 md:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Step {i + 1}</p>
            <h3 className="font-sans text-base font-semibold text-forest-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ImageCardGrid({
  cards,
}: {
  cards: { image: string; alt: string; title: string; text: string }[];
}) {
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {cards.map((c) => (
        <li key={c.title} className="overflow-hidden rounded-xl border border-beige-300/80 bg-cream-50 shadow-card">
          <Image
            src={c.image}
            alt={c.alt}
            width={556}
            height={230}
            sizes="(min-width:768px) 33vw, 100vw"
            className="aspect-[556/230] w-full object-cover"
          />
          <div className="p-5">
            <h3 className="font-serif text-xl font-semibold text-forest-800">{c.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{c.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

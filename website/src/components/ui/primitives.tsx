import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold text-sm transition-colors duration-200 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 min-h-11 px-5";
export const buttonStyles = {
  primary: cn(base, "bg-forest-800 text-white hover:bg-forest-950 shadow-sm"),
  outline: cn(base, "border border-forest-800 text-forest-800 bg-white/70 hover:bg-forest-800 hover:text-white"),
  light: cn(base, "bg-white text-forest-900 hover:bg-beige"),
  ghost: cn(base, "text-forest-800 hover:bg-leaf-100"),
};

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link className={cn(buttonStyles[variant], className)} {...props} />;
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-bold uppercase tracking-[0.2em] text-rust sm:text-sm", className)}>{children}</p>
  );
}

/** Centered section heading with the small leaf flourish shown in the references. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "text-center mx-auto" : "text-left", "max-w-3xl", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag className="mt-1 font-serif text-3xl font-bold leading-tight text-forest-800 sm:text-4xl">{title}</Tag>
      {align === "center" && <LeafFlourish className="mx-auto mt-2" />}
      {subtitle && <p className="mt-3 text-base text-ink-soft">{subtitle}</p>}
    </div>
  );
}

export function LeafFlourish({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 16" className={cn("h-4 w-28 text-leaf-600", className)} fill="none">
      <path d="M2 8h44M74 8h44" stroke="currentColor" strokeWidth="1" opacity=".5" />
      <path d="M60 2c-6 2-9 5-9 9 4 0 7-2 9-6 2 4 5 6 9 6 0-4-3-7-9-9Z" fill="currentColor" />
    </svg>
  );
}

/** Round icon badge used in trust strips and feature grids. */
export function IconBadge({
  children,
  tone = "outline",
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: "outline" | "solid" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-10 w-10", md: "h-12 w-12", lg: "h-16 w-16" };
  const tones = {
    outline: "border-2 border-forest-800/80 text-forest-800 bg-white",
    solid: "bg-forest-800 text-white",
    gold: "bg-beige text-gold-700 border border-gold/40",
  };
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", sizes[size], tones[tone], className)}
    >
      {children}
    </span>
  );
}

export function SampleBadge({ children = "Sample content" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gold/50 bg-beige px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
      {children}
    </span>
  );
}

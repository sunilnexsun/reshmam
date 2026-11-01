import Image from "next/image";
import Link from "next/link";
import { cn } from "@storefront/_components/ui/primitives";

export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  const light = variant === "light";
  return (
    <Link href="/" aria-label="RESHMAM Natural Goodness — home" className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={light ? "/images/logo-mark-white.png" : "/images/logo-mark.png"}
        alt=""
        width={53}
        height={48}
        className="h-10 w-auto sm:h-12"
        priority
      />
      <span className="leading-none">
        <span
          className={cn(
            "block font-serif text-[26px] font-bold tracking-wide sm:text-[32px]",
            light ? "text-white" : "text-forest-800",
          )}
        >
          RESHMAM
        </span>
        <span
          className={cn(
            "mt-1 block text-[8.5px] font-semibold uppercase tracking-[0.16em] sm:text-[9.5px] sm:tracking-[0.2em]",
            light ? "text-white/80" : "text-leaf-600",
          )}
        >
          Natural Goodness
        </span>
      </span>
    </Link>
  );
}

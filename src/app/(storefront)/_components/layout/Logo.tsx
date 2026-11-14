import Image from "next/image";
import Link from "next/link";
import { cn } from "@storefront/_components/ui/primitives";

/** Full RESHMAM logo (chef mark + wordmark) used in the site header. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="RESHMAM home" className={cn("inline-flex items-center", className)}>
      <Image src="/images/logo.png" alt="RESHMAM" width={128} height={68} className="h-14 w-auto sm:h-[68px]" priority />
    </Link>
  );
}

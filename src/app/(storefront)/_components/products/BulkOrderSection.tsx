import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink, Eyebrow } from "@storefront/_components/ui/primitives";

export function BulkOrderSection() {
  return (
    <section aria-labelledby="bulk-heading" className="relative overflow-hidden bg-beige">
      <Image
        src="/images/bulk-left.webp"
        alt=""
        width={620}
        height={388}
        className="absolute bottom-0 left-0 hidden h-full w-auto object-cover md:block md:w-[28%] lg:w-[30%]"
      />
      <Image
        src="/images/bulk-right.webp"
        alt=""
        width={578}
        height={388}
        className="absolute bottom-0 right-0 hidden h-full w-auto object-cover md:block md:w-[26%] lg:w-[28%]"
      />
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,transparent_22%,var(--color-beige)_32%,var(--color-beige)_70%,transparent_78%)] md:block" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
        <div className="md:ml-[30%] md:max-w-[42%]">
          <Eyebrow>Bulk Orders</Eyebrow>
          <h2 id="bulk-heading" className="mt-2 font-serif text-3xl font-bold leading-tight text-forest-800 sm:text-4xl">
            Looking for wholesale pricing?
          </h2>
          <p className="mt-3 text-base text-ink-soft">We offer special rates for bulk orders and retail partnerships.</p>
          <ButtonLink href="/contact?subject=bulk-orders#enquiry" className="mt-6 px-7">
            Inquire About Bulk Orders <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

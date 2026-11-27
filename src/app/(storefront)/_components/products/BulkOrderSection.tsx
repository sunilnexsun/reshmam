import Image from "next/image";
import Link from "next/link";

const BULK_ENQUIRY = "/contact?subject=bulk-orders#enquiry";

export function BulkOrderSection() {
  return (
    <>
      {/* The designed banner, on every screen size. Its text and button are part of the artwork, so the heading is
          kept for screen readers and a link sits over the drawn "Enquire About Bulk Orders" button. */}
      <section aria-labelledby="bulk-heading" className="relative bg-beige">
        <Image
          src="/images/bulk-banner.webp"
          alt="Sacks of seeds, bowls of sesame, groundnuts and coconut, RESHMAM oil bottles and shipping boxes"
          width={1600}
          height={533}
          sizes="100vw"
          className="h-auto w-full"
        />
        <div className="sr-only">
          <p>Bulk Orders</p>
          <h2 id="bulk-heading">Looking for wholesale pricing?</h2>
          <p>We offer special rates for bulk orders and retail partnerships.</p>
        </div>
        <Link
          href={BULK_ENQUIRY}
          aria-label="Enquire About Bulk Orders"
          className="absolute rounded-full before:absolute before:-inset-x-2 before:-inset-y-4 focus-visible:outline-offset-4 lg:before:hidden"
          style={{ left: "38.4%", top: "54.2%", width: "22.4%", height: "9.8%" }}
        />
      </section>

    </>
  );
}

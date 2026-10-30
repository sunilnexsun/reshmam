import Link from "next/link";
import { Headset, Phone, Truck, PackageSearch } from "lucide-react";
import { site } from "@/lib/site";
import { formatINR } from "@/lib/pricing";

export function AnnouncementBar() {
  return (
    <div className="bg-forest-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Free delivery across Tamil Nadu on orders above {formatINR(site.shipping.freeThreshold)}
          </span>
        </p>
        <ul className="hidden items-center divide-x divide-white/30 md:flex">
          <li className="px-3">
            <Link href="/track-order" className="inline-flex items-center gap-1.5 hover:underline">
              <PackageSearch className="h-3.5 w-3.5" aria-hidden /> Track Order
            </Link>
          </li>
          <li className="px-3">
            <Link href="/contact" className="inline-flex items-center gap-1.5 hover:underline">
              <Headset className="h-3.5 w-3.5" aria-hidden /> Help &amp; Support
            </Link>
          </li>
          <li className="pl-3">
            <a href={`tel:${site.phone.tel}`} className="inline-flex items-center gap-1.5 hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden /> {site.phone.display}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

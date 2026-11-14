import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { customerSupportLinks, footerQuickLinks, policyLinks, site, whatsappUrl } from "@storefront/_lib/site";
import { SocialLinks, WhatsappIcon } from "@storefront/_components/ui/social-icons";
import { LeafOutline } from "@storefront/_components/ui/decor";

/* ---------------- reusable pieces ---------------- */

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-5 font-sans text-xs font-bold uppercase tracking-[0.18em] text-gold">{children}</h2>
  );
}

export function FooterColumn({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <FooterHeading>{title}</FooterHeading>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ContactItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 text-sm leading-relaxed text-white/85">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
        {children}
      </span>
    </li>
  );
}

/* ---------------- footer ---------------- */

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-forest-950 text-white">
      {/* layered background: deep green with a soft warm glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgb(201_149_67/0.16),transparent_60%),radial-gradient(40rem_24rem_at_0%_100%,rgb(77_138_56/0.18),transparent_60%)]"
      />
      <LeafOutline className="absolute -left-6 bottom-24 h-56 w-40 text-white/[0.05]" />
      <LeafOutline flip className="absolute -right-6 top-40 h-64 w-44 text-white/[0.05]" />


      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-14 pt-16 sm:gap-x-8 sm:px-6 md:grid-cols-3 lg:grid-cols-[1.5fr_0.8fr_1fr_0.9fr_1.5fr] lg:px-8">
        {/* 1. Brand */}
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <Link href="/" aria-label="Reshmam home" className="inline-flex items-center gap-3">
            <Image src="/images/logo-mark.png" alt="" width={64} height={64} className="h-16 w-16" />
            <span className="font-serif text-[30px] font-bold leading-none tracking-wide">RESHMAM</span>
          </Link>
          <p className="mt-3 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
            {site.brandLine}
          </p>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">{site.description}</p>
          <SocialLinks className="mt-6 flex gap-3" />
        </div>

        {/* 2–4. Link columns */}
        <FooterColumn title="Quick Links" links={footerQuickLinks} />
        <FooterColumn title="Customer Support" links={customerSupportLinks} />
        <FooterColumn title="Policies" links={policyLinks} />

        {/* 5. Contact */}
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <FooterHeading>Contact Information</FooterHeading>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <ContactItem icon={<Phone className="h-4 w-4" />} label="Phone">
              <a href={`tel:${site.phone.tel}`} className="hover:underline">
                {site.phone.display}
              </a>
            </ContactItem>
            <ContactItem icon={<Mail className="h-4 w-4" />} label="Email">
              <a href={`mailto:${site.emails.info}`} className="break-all hover:underline">
                {site.emails.info}
              </a>
            </ContactItem>
            <ContactItem icon={<MapPin className="h-4 w-4" />} label="Business Address">
              <address className="not-italic">
                {site.address.company}, {site.address.lines[0]} {site.address.lines[1]}
              </address>
            </ContactItem>
            <ContactItem icon={<WhatsappIcon className="h-4 w-4" />} label="WhatsApp">
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#188643] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#11703a]"
              >
                <WhatsappIcon className="h-3.5 w-3.5" /> Chat on WhatsApp
                <span className="sr-only"> (opens WhatsApp, {site.whatsapp.display})</span>
              </a>
            </ContactItem>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-x-6 gap-y-1.5 px-4 pb-24 pt-5 text-center text-xs text-white/65 sm:flex-row sm:px-6 sm:pb-5 sm:text-left lg:px-8">
          <p>{site.copyright}</p>
          <p className="sm:mr-20 sm:text-right">{site.credit}</p>
        </div>
      </div>
    </footer>
  );
}

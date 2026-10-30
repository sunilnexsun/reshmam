import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, HelpCircle, PackageSearch, RotateCcw, ShieldCheck, Truck, XCircle } from "lucide-react";
import { customerSupportLinks, policyLinks } from "@/lib/site";
import { PageBanner, SupportBox } from "./PageBanner";
import { Container, cn } from "../ui/primitives";

const icons: Record<string, typeof Truck> = {
  "/track-order": PackageSearch,
  "/shipping-delivery": Truck,
  "/returns-refund-policy": RotateCcw,
  "/faq": HelpCircle,
  "/privacy-policy": ShieldCheck,
  "/terms-conditions": FileText,
  "/cancellation-policy": XCircle,
};

const groups = [
  { title: "Customer Support", links: customerSupportLinks },
  { title: "Policies", links: policyLinks },
];

/** Left-hand menu shared by the help and policy pages. */
function HelpNav({ current }: { current: string }) {
  return (
    <nav aria-label="Help and policies" className="min-w-0 lg:sticky lg:top-28">
      <div className="flex flex-col gap-5 rounded-2xl border border-beige-300/80 bg-white p-3 shadow-card sm:p-4">
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="px-2 pb-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-rust">{g.title}</h2>
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
              {g.links.map((l) => {
                const Icon = icons[l.href] ?? FileText;
                const active = l.href === current;
                return (
                  <li key={l.href} className="shrink-0">
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-forest-800 text-white"
                          : "border border-beige-300 text-ink hover:border-forest-800 hover:text-forest-800 lg:border-transparent lg:hover:bg-cream",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-forest-800")} aria-hidden />
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Banner + two-column layout: help menu on the left, page content on the right. */
export function HelpCenterLayout({
  current,
  title,
  intro,
  children,
}: {
  current: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageBanner title={title} intro={intro} crumbs={[{ href: "/", label: "Home" }, { label: title }]} />
      <section className="bg-paper py-10 lg:py-12">
        <Container className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
          <HelpNav current={current} />
          <div className="min-w-0">{children}</div>
        </Container>
      </section>
    </>
  );
}

/** Shared layout for policy pages: help menu on the left, policy text on the right. */
export function PolicyPage({
  title,
  intro,
  href,
  children,
}: {
  title: string;
  intro?: ReactNode;
  href: string;
  children: ReactNode;
}) {
  return (
    <HelpCenterLayout current={href} title={title} intro={intro}>
      <article className="prose-reshmam rounded-2xl border border-beige-300/80 bg-white p-6 text-ink sm:p-8" data-policy={href}>
        {children}
      </article>
      <SupportBox />
    </HelpCenterLayout>
  );
}

import type { Metadata } from "next";
import { SupportBox } from "@/components/sections/PageBanner";
import { HelpCenterLayout } from "@/components/sections/HelpCenter";
import { JsonLd } from "@/components/sections/Misc";
import { faqs } from "@/lib/faqs";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about ordering, delivery, cancellations, refunds and payments at Reshmam.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <HelpCenterLayout current="/faq" title="Frequently Asked Questions">
        <div className="divide-y divide-beige-300 rounded-2xl border border-beige-300/80 bg-white">
          {faqs.map((f, i) => (
            <details key={f.q} className="group p-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-forest-900">
                <span>
                  <span className="mr-2 text-gold-700">{i + 1}.</span>
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="text-xl text-forest-800 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
        <SupportBox />
      </HelpCenterLayout>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </>
  );
}

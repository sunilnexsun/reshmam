import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHero, Gold } from "@/components/sections/PageHero";
import { ContactForm, ContactFormFromUrl } from "@/components/contact/ContactForm";
import { JsonLd } from "@/components/sections/Misc";
import { Container, IconBadge } from "@/components/ui/primitives";
import { LeafSprig } from "@/components/ui/decor";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about RESHMAM cold pressed oils, an order, or bulk and retail partnerships? Call +91 98765 43210, email info@reshmam.com or visit us in Kovilpatti, Tamil Nadu.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "/contact", images: ["/images/contact-hero.webp"] },
};

const storeLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: `RESHMAM Natural Goodness – ${site.address.company}`,
  telephone: site.address.mobile.tel,
  email: site.emails.info,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.street,
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
  geo: { "@type": "GeoCoordinates", latitude: site.map.lat, longitude: site.map.lng },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  hasMap: site.map.directionsUrl,
};

function AddressLines() {
  return (
    <>
      {site.address.company}
      <br />
      {site.address.lines[0]}
      <br />
      {site.address.lines[1]}
      <br />
      Mobile:{" "}
      <a href={`tel:${site.address.mobile.tel}`} className="hover:underline">
        {site.address.mobile.display}
      </a>
    </>
  );
}

export default function ContactPage() {
  const cards = [
    {
      icon: Phone,
      title: "Call Us",
      body: (
        <>
          <a href={`tel:${site.phone.tel}`} className="block text-base font-semibold text-forest-900 hover:underline">
            {site.phone.display}
          </a>
        </>
      ),
    },
    {
      icon: Mail,
      title: "Email Us",
      body: (
        <>
          <a href={`mailto:${site.emails.info}`} className="block font-semibold text-forest-900 hover:underline">
            {site.emails.info}
          </a>
          <a href={`mailto:${site.emails.orders}`} className="block font-semibold text-forest-900 hover:underline">
            {site.emails.orders}
          </a>
          <span className="mt-1 block">{site.responseTimeCopy}</span>
        </>
      ),
    },
    {
      icon: MapPin,
      title: "Our Location",
      body: (
        <address className="not-italic">
          <AddressLines />
        </address>
      ),
    },
    {
      icon: Clock,
      title: "Working Hours",
      body: (
        <>
          Monday – Saturday
          <br />
          <span className="whitespace-nowrap">9:00 AM – 6:00 PM</span>
          <br />
          {site.hours.sunday}
        </>
      ),
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title={
          <>
            We&apos;re Here <br />
            <Gold>for You</Gold>
          </>
        }
        description={
          <p>
            Have a question about our products, need help with an order, or just want to say hello? We&apos;d love to
            hear from you.
          </p>
        }
        image="/images/contact-hero.webp"
        imageAlt="RESHMAM oil bottles with seeds, groundnuts and coconut beside a card reading Pure Foods, Brighter Days"
      />

      <section aria-label="Contact details" className="relative bg-paper">
        <Container className="relative z-10 -mt-2 py-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex flex-col items-center gap-4 rounded-xl border border-beige-300/80 bg-cream-50 p-6 text-center shadow-card"
              >
                <IconBadge size="lg" className="h-14 w-14 border-forest-800/40">
                  <Icon className="h-6 w-6" />
                </IconBadge>
                <div className="text-sm leading-relaxed text-ink-soft">
                  <h2 className="mb-1.5 font-sans text-base font-semibold text-forest-900">{title}</h2>
                  {body}
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-label="Enquiry form and store location" className="relative overflow-hidden bg-paper pb-16">
        <LeafSprig className="absolute -left-10 bottom-0 hidden h-48 w-32 rotate-[200deg] lg:block" />
        <LeafSprig flip className="absolute -right-10 bottom-10 hidden h-48 w-32 rotate-[160deg] lg:block" />
        <Container className="relative grid gap-6 lg:grid-cols-2">
          <div id="enquiry" className="scroll-mt-28 rounded-xl border border-beige-300/80 bg-cream-50 p-6 shadow-card sm:p-8">
            <h2 className="font-serif text-3xl font-bold text-forest-800 sm:text-4xl">Send Us an Enquiry</h2>
            <p className="mb-6 mt-2 text-ink-soft">Fill in the form and our team will get back to you shortly.</p>
            <Suspense fallback={<ContactForm />}>
              <ContactFormFromUrl />
            </Suspense>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-beige-300/80 bg-cream-50 shadow-card">
            <div className="relative min-h-72 flex-1 bg-beige sm:min-h-80">
              <iframe
                title="Map showing the RESHMAM store location in Kovilpatti"
                src={site.map.embedUrl}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <IconBadge tone="gold" size="lg" className="h-14 w-14">
                  <MapPin className="h-6 w-6" />
                </IconBadge>
                <div>
                  <h2 className="font-sans text-lg font-semibold text-forest-900">Visit Our Store</h2>
                  <address className="mt-1 text-sm not-italic leading-relaxed text-ink-soft">
                    <AddressLines />
                  </address>
                </div>
              </div>
              <a
                href={site.map.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-forest-800 px-6 text-sm font-semibold text-white hover:bg-forest-950"
              >
                Get Directions <ArrowRight className="h-4 w-4" aria-hidden />
                <span className="sr-only">(opens Google Maps in a new tab)</span>
              </a>
            </div>
          </div>
        </Container>
      </section>
      <JsonLd data={storeLd} />
    </>
  );
}

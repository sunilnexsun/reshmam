import type { Metadata, Viewport } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/inter";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/Toaster";
import { Chatbot } from "@/components/chat/Chatbot";
import { JsonLd } from "@/components/sections/Misc";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "RESHMAM Natural Goodness — Traditional Cold Pressed Oils",
    template: "%s | RESHMAM Natural Goodness",
  },
  description:
    "Traditionally extracted, chemical-free cold pressed gingelly, groundnut, coconut and castor oils from RESHMAM. Free delivery across Tamil Nadu on orders above ₹999.",
  applicationName: "RESHMAM",
  openGraph: {
    type: "website",
    siteName: "RESHMAM Natural Goodness",
    locale: "en_IN",
    images: [{ url: "/images/hero-products.webp", width: 488, height: 307, alt: "RESHMAM cold pressed oils" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/images/logo-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#003b22",
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RESHMAM Natural Goodness",
  url: site.url,
  logo: `${site.url}/images/logo.png`,
  email: site.emails.info,
  telephone: site.phone.tel,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.street,
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AnnouncementBar />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <Toaster />
        <Chatbot />
        <JsonLd data={organizationLd} />
      </body>
    </html>
  );
}

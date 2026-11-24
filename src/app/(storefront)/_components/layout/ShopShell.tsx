import { AnnouncementBar } from "./AnnouncementBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AccountSync } from "./AccountSync";
import { SignInDialogProvider } from "@storefront/_components/account/SignInDialogProvider";
import { Toaster } from "@storefront/_components/ui/Toaster";
import { Chatbot } from "@storefront/_components/chat/Chatbot";
import { JsonLd } from "@storefront/_components/sections/Misc";
import { site } from "@storefront/_lib/site";

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

/** Storefront chrome shared by the (storefront) layout and the 404 page. */
export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <SignInDialogProvider>
      <div className="flex min-h-screen flex-col antialiased">
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
        <AccountSync />
        <JsonLd data={organizationLd} />
      </div>
    </SignInDialogProvider>
  );
}

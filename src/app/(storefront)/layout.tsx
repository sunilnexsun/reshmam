import type { Metadata, Viewport } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/inter";
import "./globals.css";
import { ShopShell } from "./_components/layout/ShopShell";
import { openGraphBase, site } from "./_lib/site";

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
    ...openGraphBase,
    images: [{ url: "/images/hero-products.webp", width: 488, height: 307, alt: "RESHMAM cold pressed oils" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/images/logo-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#003b22",
};

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return <ShopShell>{children}</ShopShell>;
}

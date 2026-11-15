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
    "Traditionally extracted, chemical-free cold pressed gingelly, groundnut and coconut oils from RESHMAM. Free delivery across Tamil Nadu on orders above ₹1,499.",
  applicationName: "RESHMAM",
  openGraph: {
    type: "website",
    ...openGraphBase,
    images: [{ url: "/images/home-banner.webp", width: 1600, height: 666, alt: "RESHMAM cold pressed oils — Tradition in Every Drop" }],
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

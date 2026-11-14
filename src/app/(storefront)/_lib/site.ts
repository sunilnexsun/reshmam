/**
 * Central business settings. Everything customer-facing that the business
 * may need to change (contact details, hours, delivery rules, social links,
 * video URLs) lives here so it is edited in one place.
 */
/**
 * Open Graph fields every page shares. Next.js replaces (doesn't merge) a page's `openGraph` object with the
 * layout's, so pages that set their own spread this in to keep the site name and locale.
 */
export const openGraphBase = { siteName: "RESHMAM Natural Goodness", locale: "en_IN" } as const;

export const site = {
  name: "RESHMAM",
  subBrand: "Natural Goodness",
  tagline: "Pure Oils. Brighter Days.",
  description:
    "Traditionally extracted, chemical-free cold pressed oils for a healthier tomorrow.",
  // Set NEXT_PUBLIC_SITE_URL before building. Without it a production build uses the live domain, so
  // canonical URLs, the sitemap and link previews never point at localhost.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://www.reshmam.com" : "http://localhost:3000"),
  copyright: "Copyright © 2026 Reshmam. All Rights Reserved.",
  /** Brand line from the logo, shown in the footer brand section. */
  brandLine: "PURE. TRADITIONAL. TRUSTED.",
  credit: "Designed & Developed by Nexsun Tech Solutionz",

  phone: { display: "+91 97877 22272", tel: "+919787722272" },
  emails: {
    info: "info@reshmam.com",
    orders: "orders@reshmam.com",
  },
  /** Editable business setting – shown on the Contact page */
  responseTimeCopy: "We typically respond within 24 hours.",

  address: {
    company: "P.KALIAPPAN AND SONS",
    lines: ["6/104, MAIN ROAD, LAKSHMIPURAM,", "KOVILPATTI - 628 502, TAMILNADU"],
    mobile: { display: "97877 22272", tel: "+919787722272" },
    street: "6/104, Main Road, Lakshmipuram",
    locality: "Kovilpatti",
    region: "Tamil Nadu",
    postalCode: "628502",
    country: "IN",
  },

  hours: {
    weekdays: "Monday–Saturday: 9:00 AM–6:00 PM",
    short: "Mon – Sat, 9:00 AM – 6:00 PM",
    sunday: "Sunday: Closed",
  },

  map: {
    lat: 9.1750078,
    lng: 77.8893356,
    directionsUrl:
      "https://www.google.com/maps/place/9%C2%B010'30.0%22N+77%C2%B053'21.6%22E/@9.1750078,77.8880481,18z/data=!4m4!3m3!8m2!3d9.1750078!4d77.8893356",
    embedUrl: "https://maps.google.com/maps?q=9.1750078,77.8893356&z=17&output=embed",
  },

  /**
   * WhatsApp Support number (digits only, with country code). Used by the
   * footer and the chat assistant. Change it if WhatsApp uses another number.
   */
  whatsapp: { number: "919787722272", display: "+91 97877 22272" },

  /** Replace "#" with the real profile URLs. Links still set to "#" show as "coming soon". */
  social: {
    instagram: "#",
    facebook: "#",
  },

  /**
   * Marketplaces RESHMAM is also sold on, shown in the "Also available on" section of the home page.
   * Replace "#" with each store's RESHMAM listing URL; entries still set to "#" are shown without a link.
   * `logo` takes a path under /public (e.g. "/images/marketplaces/amazon.svg") once the official logo
   * files are supplied; until then the store name is shown as text.
   */
  marketplaces: [
    { name: "Amazon", url: "#", logo: null },
    { name: "Zepto", url: "#", logo: null },
    { name: "Swiggy Instamart", url: "#", logo: null },
    { name: "JioMart", url: "#", logo: null },
  ] as { name: string; url: string; logo: string | null }[],

  /**
   * Current offers shown by the chat assistant. Only list offers that are
   * actually running — the assistant never invents discounts or coupon codes.
   */
  offers: [
    { title: "Free delivery", text: "Free delivery across Tamil Nadu on orders above ₹1,499." },
    {
      title: "Bulk & wholesale pricing",
      text: "Special rates for bulk orders and retail partnerships — send a bulk enquiry from the Contact page.",
    },
  ] as { title: string; text: string }[],

  /**
   * Video URLs for the Our Story page. Leave null to show a clearly
   * labelled placeholder. Accepts an .mp4/.webm URL or a YouTube embed URL.
   */
  videos: {
    process: null as string | null,
    story: null as string | null,
  },

  /** Delivery rules – amounts in rupees. Provisional, set by the business. */
  shipping: {
    freeThreshold: 1499,
    tamilNaduFee: 60,
    restOfIndiaFee: 120,
    homeState: "Tamil Nadu",
  },
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/our-story", label: "Our Story" },
  { href: "/health-benefits", label: "Health Benefits" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerQuickLinks = [
  { href: "/", label: "Home" },
  { href: "/our-story", label: "About Us" },
  { href: "/products", label: "Shop" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/contact", label: "Contact Us" },
] as const;

export const customerSupportLinks = [
  { href: "/track-order", label: "Track Order" },
  { href: "/shipping-delivery", label: "Shipping & Delivery" },
  { href: "/returns-refund-policy", label: "Returns & Refund Policy" },
  { href: "/faq", label: "FAQ" },
] as const;

export const policyLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-conditions", label: "Terms & Conditions" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
] as const;

export const whatsappUrl = (text?: string) =>
  `https://wa.me/${site.whatsapp.number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}

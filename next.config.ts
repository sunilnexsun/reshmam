import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Headers are fixed when the app is built, so env vars must be set at build time. Supabase projects live on
// *.supabase.co, which is always allowed, so a build made without NEXT_PUBLIC_SUPABASE_URL still lets
// customers sign in; a custom Supabase domain is added when the variable is set.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Content Security Policy without nonces, so pages stay statically prerendered (nonces would force
 * every page to render per request). Razorpay Checkout loads its script, frames and API calls from
 * *.razorpay.com; the contact page and the video section embed Google Maps and YouTube (or Vimeo).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Our Story videos may be hosted elsewhere (site.videos).
  "media-src 'self' https:",
  // The Excel export compresses large files in a Web Worker built from a blob: URL.
  "worker-src 'self' blob:",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    supabase.endsWith(".supabase.co") ? "" : supabase,
    "https://*.razorpay.com",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.firebasestorage.app",
    "https://*.firebaseapp.com",
    "wss://*.firebaseio.com",
  ].filter(Boolean).join(" "),
  "frame-src https://*.razorpay.com https://*.firebaseapp.com https://maps.google.com https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: opened over plain http on anything but localhost (a LAN address, a server
  // without TLS yet) it made browsers fetch every script and stylesheet over https, so pages broke. On the
  // live https site HSTS already keeps browsers on https, and the site loads nothing over http.
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\" \"https://api.razorpay.com\")" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Products removed from the catalogue (Nov 2026) send old links and search results to the shop page.
  async redirects() {
    return [
      "castor-oil",
      "mayil-rotary-gingelly-oil-cake",
      "jothi-rotary-gingelly-oil-cake",
      // Velum Mayilum branch products, removed Nov 2026.
      "premium-gingelly-oil",
      "pure-coconut-oil",
      "velum-mayilum-groundnut-oil",
    ].map((slug) => ({
      source: `/products/${slug}`,
      destination: "/products",
      permanent: true,
    }));
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

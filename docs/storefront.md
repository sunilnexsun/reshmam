# RESHMAM Natural Goodness — Storefront

Responsive ecommerce site for RESHMAM traditional cold-pressed oils. It shares one Next.js app with
the admin panel (`/admin`, see [admin.md](admin.md)); this guide covers the storefront. Imports use
`@storefront/…` for this folder, e.g. `import { site } from "@storefront/_lib/site"`.
*Pure Oils. Brighter Days.*

**Stack:** Next.js 16 (App Router, TypeScript, Cache Components) · React 19 · Tailwind CSS 4 · Lucide icons · Zod · Supabase (optional) · Razorpay (optional) · Resend (optional). Fonts are self-hosted via Fontsource (Playfair Display + Inter), so no build-time calls to Google Fonts.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional – the site runs without any keys
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
npm run lint
npm test                     # unit, route and database tests
```

Without credentials the full storefront works (browsing, filters, variants, search, wishlist, cart). Features that need a backend **say so honestly** instead of faking success:

| Feature | Without keys | With keys |
|---|---|---|
| Enquiry / bulk forms | Validates, then shows “not connected yet” + phone/email (HTTP 503) | Stored in Supabase and/or emailed via Resend |
| Checkout | Order review works; “Online ordering coming soon”, button disabled | COD orders placed; online payment via Razorpay |
| Track order / confirmation | “Not enabled yet” message | Looks up order by number + email (or token) |
| Account | “Accounts being set up” + quick links | Supabase magic-link sign-in; order history; cart and wishlist saved to the account |
| Cart / wishlist | Kept in this browser | Also saved to the signed-in customer’s account and shared across devices (`_lib/account-sync.ts`) |
| Our Story videos | Poster + “Video coming soon” label | Set `site.videos.*` in `src/app/(storefront)/_lib/site.ts` |

## Pages

`/` Home · `/products` (filters via `?category=`, search via `?q=`) · `/products/[slug]` · `/new-arrivals` · `/our-story` · `/health-benefits` · `/blog`, `/blog/[slug]` · `/contact` (`?subject=bulk-orders` preselects) · `/cart` · `/checkout` · `/checkout/confirmation` · `/wishlist` · `/account` · `/track-order` · `/faq` · `/shipping-delivery` · `/returns-refund-policy` · `/privacy-policy` · `/terms-conditions` · `/cancellation-policy` · `sitemap.xml` · `robots.txt`

## Footer

`src/app/(storefront)/_components/layout/Footer.tsx` is built from small reusable parts (`FooterColumn`, `ContactItem`,
`SocialLinks`). Link lists live in `src/app/(storefront)/_lib/site.ts` (`footerQuickLinks`, `customerSupportLinks`,
`policyLinks`). Social icons link out only once real URLs are set in `site.social`; until then they show as
"coming soon". The WhatsApp button uses `site.whatsapp`.

## Help & policy pages

Track Order, Shipping & Delivery, Returns & Refund Policy, FAQ, Privacy Policy, Terms & Conditions and
Cancellation Policy share `HelpCenterLayout` (`src/app/(storefront)/_components/sections/HelpCenter.tsx`): a menu of all seven
pages on the left and the selected page on the right (a scrollable menu above the content on phones).

## Chat assistant

A floating shopping assistant (bottom-right on every page) built in `src/app/(storefront)/_components/chat/`:
`chatbot-core.ts` holds all the logic and styling (framework-free), `Chatbot.tsx` mounts it in the layout.
It covers: welcome menu, product categories, product lists, product details with size/quantity/add-to-cart,
recommendations by need, offers & delivery, order tracking (via `/api/orders/lookup`), WhatsApp support and
a call-back request that opens WhatsApp with the customer's name and phone filled in. It also understands typed
questions (product names, "track my order", "cancel", "refund", "offers", "talk to someone").

It is a guided, rule-based assistant: it answers only from the catalogue, `site.offers` and the FAQ, so it never
invents prices, discounts or order details. To add free-form AI answers later, connect an AI API on the server.

## Where to edit things

| What | File |
|---|---|
| Phone, emails, address, hours, map link, WhatsApp number, socials, marketplaces, offers, delivery fees, video URLs | `src/app/(storefront)/_lib/site.ts` |
| FAQ answers (FAQ page and chat assistant) | `src/app/(storefront)/_lib/faqs.ts` |
| Products, variants, starting prices and stock | `src/app/(storefront)/_lib/products.ts` (once Supabase is connected, prices and stock in `product_variants` win — see below) |
| Blog articles (sample) | `src/app/(storefront)/_lib/blog.ts` |
| Colours, fonts, shadows (design tokens) | `src/app/(storefront)/globals.css` (`@theme`) |
| Policy page text (drafts) | `src/app/(storefront)/*-policy`, `shipping-delivery`, `terms-conditions`, `faq` |

After changing products, regenerate the database seed: `npm run db:seed:generate`.

## Architecture

```
src/app/
  layout.tsx                 bare <html>/<body>, shared with the admin panel
  not-found.tsx              404 page with the storefront header and footer
  (storefront)/              everything for the customer site (served at /)
    layout.tsx               header, footer and chat around every page
    globals.css              storefront styles (design tokens in @theme)
    page.tsx, products/, cart/, checkout/, blog/, …   one folder per page
    api/contact              enquiry + bulk enquiry (validation, honeypot, timing check, rate limit)
    api/checkout             server-side pricing, stock check, order creation, Razorpay order
    api/checkout/status      tells the UI which integrations are live
    api/payments/razorpay/   verify (signature + API status + amount) and webhook
    api/catalogue/live       live stock and prices from the database (cached a minute; null without Supabase)
    api/orders/lookup        confirmation (token) and track-order (number + email)
    _components/
      layout/                ShopShell, AnnouncementBar, Header (nav, dropdown, search, mobile menu), Footer, Logo
      products/              ProductCard, ProductGrid/CategoryFilter/ProductCatalog, ProductPurchase, BulkOrderSection, WishlistView
      sections/              PageHero, TrustStrip/FeatureGrid, VideoSection, VisionMissionValues, JourneyTimeline,
                             ImageCardGrid, Testimonials, BlogCard, Breadcrumbs, JsonLd, ClosingBanner, PageBanner
      contact/ContactForm    (the map and directions card are on the /contact page itself)
      cart/                  CartView, CheckoutForm, OrderStatus, TrackOrderForm
    _lib/
      site.ts products.ts blog.ts pricing.ts validation.ts store.ts (cart/wishlist persistence)
      live.ts live-catalogue.ts  live stock/prices applied over the catalogue (server and browser)
      server/                integrations (Supabase admin, Razorpay, Resend, rate limit), orders, catalogue (live stock)
src/proxy.ts                 real 404s for unknown product and blog URLs
supabase/
  migrations/                schema + RLS + order and stock functions
  seed.sql                   generated from src/app/(storefront)/_lib/products.ts
```

**Security notes**
- The browser only ever sends variant IDs and quantities. `priceCart()` re-prices on the server; when Supabase is configured, live stock and DB prices are also checked, and a mismatch is refused.
- Orders are marked paid only after the Razorpay signature is verified **and** Razorpay’s API reports the payment **captured** for the expected amount, or via a signature-verified `payment.captured` / `order.paid` webhook. An `authorized` payment is left pending for the webhook. A browser redirect alone never marks an order paid.
- `mark_order_paid()` only marks orders still waiting for payment. A payment for an order that is already paid (a duplicate), refunded or cancelled (late), for the wrong amount, or for an unknown Razorpay order is recorded in `payment_issues` for staff — never silently dropped. The `payment.failed` webhook marks the order `payment_failed` (`mark_order_failed()`); a later successful attempt still marks it paid.
- When Supabase is configured, stock and prices in `product_variants` are the source of truth: checkout prices from them, and product pages and the cart show them (`/api/catalogue/live`).
- Every response sends a Content Security Policy (no nonces, so pages stay static), `frame-ancestors 'none'`, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` — see `next.config.ts`. Add any new third-party script, frame or API host there.
- `SUPABASE_SERVICE_ROLE_KEY` is imported only in `server-only` modules. All 13 tables have RLS; enquiries and inventory have no public policies.
- Orders are written in one transaction by `place_order()` (customer, address, order, items and — for cash on delivery — stock), so a failure never leaves half an order behind.
- `commit_order_stock()` locks the variant rows, sums quantities per variant and raises `insufficient_stock` rather than going below zero. It runs once per order (idempotent, audited in `inventory_movements`).
- `mark_order_paid()` marks an order paid and commits its stock together. If stock ran out before the payment arrived, the payment is kept and the order gets `stock_shortfall = true` for staff to follow up.
- These functions are callable only with the service-role key (revoked from `anon` and `authenticated`).
- The in-memory rate limiter suits a single instance; use a shared store (e.g. Upstash Redis) when running multiple instances.

## Supabase setup

1. Create a project at supabase.com.
2. Apply the schema: `supabase link --project-ref <ref> && supabase db push`, or paste `supabase/migrations/*.sql` into the SQL editor.
3. Load data: run `supabase/seed.sql` in the SQL editor (re-running is safe — it never overwrites live stock).
4. Copy the project URL, anon key and service-role key into `.env.local`.
5. Auth → URL configuration: add `https://<your-domain>/account` as a redirect URL for magic links.

## Razorpay setup

1. Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (start with test keys).
2. Dashboard → Webhooks → `https://<your-domain>/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid` and `payment.failed`; put the secret in `RAZORPAY_WEBHOOK_SECRET`.
3. Test with Razorpay test cards/UPI before switching to live keys.

## Deployment

Any Node host that runs Next.js 16 (Vercel recommended). Set the environment variables from `.env.example` **before building** — the `NEXT_PUBLIC_*` values and the security headers (CSP) are fixed at build time. Set `NEXT_PUBLIC_SITE_URL` to the live domain (a production build without it uses `https://www.reshmam.com`). Node ≥ 20.9.

The admin panel at `/admin` is a demo with browser-only sign-in until it is connected to Supabase Auth. It is served by default; set `DISABLE_ADMIN_DEMO=1` to answer it with a 404 on the public site.

## Credentials still required

- Supabase project (URL, anon key, service-role key)
- Razorpay merchant account (key ID, secret, webhook secret)
- Resend account + verified sending domain (or swap `sendEmail()` for your SMTP provider)
- Amazon, Zepto, Swiggy Instamart and JioMart listing URLs and official logo files (`site.marketplaces`), shown in the home page's "Also Available On" section

## Asset manifest

All images in `public/images/` are **provisional crops taken from the supplied design screenshots**. They are low resolution (≈250–700 px wide) and some are AI-rendered mockups — replace them with real, licensed photography of RESHMAM’s actual packaging and facility before launch. Keep the filenames (or update references) to swap without code changes.

| File | Used for | Needed |
|---|---|---|
| `logo.png` (chef + wordmark), `logo-mark.png` (chef only) | Header; footer, admin and favicon | Vector (SVG) logo + favicon set |
| `products/{gingelly,groundnut,coconut}-{500ml,1l}.webp` | Product cards and pages (per size), category cards, Health Benefits | Real product photos, ~1200×830, plain/cream background |
| `pack-{gingelly,groundnut,coconut,combo}.webp` | Family packs, gift combo | Real pack photos |
| `{home,products,health,contact,blog}-banner.webp` (desktop banners), `{home,products}-banner-mobile.webp`, `{health,contact,blog}-hero.webp` (phone/tablet crops) | Page heroes (see `BannerHero`) | ~2000×1000 lifestyle shots |
| `story-hero.webp` | Our Story hero, home story block | Real chekku photo |
| `video-process.webp`, `video-story.webp` | Video posters | Posters + the actual videos (MP4/YouTube) |
| `bts-extraction/farm/quality.webp` | Behind the Scenes | Real facility photos |
| `health-meal.webp`, `use-{cooking,salad,skin}.webp`, `banner-{health,story}-{left,right}.webp`, `bulk-*.webp` | Health/usage/banners | Licensed food & lifestyle photography |

## Content that is placeholder (clearly labelled on the site)

- **Testimonials** — labelled “Sample testimonials — not verified customer reviews”. Replace with real reviews (with permission).
- **Blog** — four sample articles, labelled “Sample”, `noindex`, excluded from the sitemap.
- **Prices / middle sizes / stock** — range ends match the screenshots; 1 L prices and stock counts are placeholders. Packs come in 500 ml and 1 L only (5 L was dropped in Nov 2026); the three-oil combo's prices are scaled from the old four-oil pack and need confirming.
- No ratings, certifications or medical claims are invented. Health copy is framed as traditional use / balanced diet with a visible disclaimer; products can carry a `notice` for safety or usage warnings.

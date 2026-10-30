# RESHMAM Natural Goodness — Storefront

Responsive ecommerce site for RESHMAM traditional cold-pressed oils.
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
```

Without credentials the full storefront works (browsing, filters, variants, search, wishlist, cart). Features that need a backend **say so honestly** instead of faking success:

| Feature | Without keys | With keys |
|---|---|---|
| Enquiry / bulk forms | Validates, then shows “not connected yet” + phone/email (HTTP 503) | Stored in Supabase and/or emailed via Resend |
| Checkout | Order review works; “Online ordering coming soon”, button disabled | COD orders placed; online payment via Razorpay |
| Track order / confirmation | “Not enabled yet” message | Looks up order by number + email (or token) |
| Account | “Accounts being set up” + quick links | Supabase magic-link sign-in |
| Our Story videos | Poster + “Video coming soon” label | Set `site.videos.*` in `src/lib/site.ts` |

## Pages

`/` Home · `/products` (filters via `?category=`, search via `?q=`) · `/products/[slug]` · `/our-story` · `/health-benefits` · `/blog`, `/blog/[slug]` · `/contact` (`?subject=bulk-orders` preselects) · `/cart` · `/checkout` · `/checkout/confirmation` · `/wishlist` · `/account` · `/track-order` · `/faq` · `/shipping-delivery` · `/returns-refund-policy` · `/privacy-policy` · `/terms-conditions` · `sitemap.xml` · `robots.txt`

## Footer

`src/components/layout/Footer.tsx` is built from small reusable parts (`FooterColumn`, `ContactItem`,
`SocialLinks`). Link lists live in `src/lib/site.ts` (`footerQuickLinks`, `customerSupportLinks`,
`policyLinks`). Social icons link out only once real URLs are set in `site.social`; until then they show as
"coming soon". The WhatsApp button uses `site.whatsapp`.

## Help & policy pages

Track Order, Shipping & Delivery, Returns & Refund Policy, FAQ, Privacy Policy, Terms & Conditions and
Cancellation Policy share `HelpCenterLayout` (`src/components/sections/HelpCenter.tsx`): a menu of all seven
pages on the left and the selected page on the right (a scrollable menu above the content on phones).

## Chat assistant

A floating shopping assistant (bottom-right on every page) built in `src/components/chat/`:
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
| Phone, emails, address, hours, map link, WhatsApp number, socials, offers, delivery fees, video URLs | `src/lib/site.ts` |
| FAQ answers (FAQ page and chat assistant) | `src/lib/faqs.ts` |
| Products, variants, prices, stock (single source of truth) | `src/lib/products.ts` |
| Blog articles (sample) | `src/lib/blog.ts` |
| Colours, fonts, shadows (design tokens) | `src/app/globals.css` (`@theme`) |
| Policy page text (drafts) | `src/app/*-policy`, `shipping-delivery`, `terms-conditions`, `faq` |

After changing products, regenerate the database seed: `npm run db:seed:generate`.

## Architecture

```
src/
  app/                       routes (pages + API route handlers)
    api/contact              enquiry + bulk enquiry (validation, honeypot, timing check, rate limit)
    api/checkout             server-side pricing, stock check, order creation, Razorpay order
    api/checkout/status      tells the UI which integrations are live
    api/payments/razorpay/   verify (signature + API status + amount) and webhook
    api/orders/lookup        confirmation (token) and track-order (number + email)
  components/
    layout/                  AnnouncementBar, Header (nav, dropdown, search, mobile menu), Footer, Logo
    products/                ProductCard, ProductGrid/CategoryFilter/ProductCatalog, ProductPurchase, BulkOrderSection, WishlistView
    sections/                PageHero, TrustStrip/FeatureGrid, VideoSection, VisionMissionValues, JourneyTimeline,
                             ImageCardGrid, Testimonials, BlogCard, Breadcrumbs, JsonLd, ClosingBanner, PageBanner
    contact/ContactForm      (StoreMap is the map + directions card on /contact)
    cart/                    CartView, CheckoutForm, OrderStatus, TrackOrderForm
  lib/
    site.ts products.ts blog.ts pricing.ts validation.ts store.ts (cart/wishlist persistence)
    server/                  integrations (Supabase admin, Razorpay, Resend, rate limit), orders
supabase/
  migrations/                schema + RLS + stock function
  seed.sql                   generated from src/lib/products.ts
```

**Security notes**
- The browser only ever sends variant IDs and quantities. `priceCart()` re-prices on the server; when Supabase is configured, live stock and DB prices are also checked, and a mismatch is refused.
- Orders are marked paid only after the Razorpay signature is verified **and** the payment is fetched from Razorpay’s API with the expected amount, or via a signature-verified webhook. A browser redirect alone never marks an order paid.
- `SUPABASE_SERVICE_ROLE_KEY` is imported only in `server-only` modules. All 13 tables have RLS; enquiries and inventory have no public policies.
- Stock is decremented once per order by `commit_order_stock()` (idempotent, audited in `inventory_movements`).
- The in-memory rate limiter suits a single instance; use a shared store (e.g. Upstash Redis) when running multiple instances.

## Supabase setup

1. Create a project at supabase.com.
2. Apply the schema: `supabase link --project-ref <ref> && supabase db push`, or paste `supabase/migrations/*.sql` into the SQL editor.
3. Load data: run `supabase/seed.sql` in the SQL editor (re-running is safe — it never overwrites live stock).
4. Copy the project URL, anon key and service-role key into `.env.local`.
5. Auth → URL configuration: add `https://<your-domain>/account` as a redirect URL for magic links.

## Razorpay setup

1. Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (start with test keys).
2. Dashboard → Webhooks → `https://<your-domain>/api/payments/razorpay/webhook`, events `payment.captured` and `order.paid`; put the secret in `RAZORPAY_WEBHOOK_SECRET`.
3. Test with Razorpay test cards/UPI before switching to live keys.

## Deployment

Any Node host that runs Next.js 16 (Vercel recommended). Set the environment variables from `.env.example`, set `NEXT_PUBLIC_SITE_URL` to the live domain, and deploy. Node ≥ 20.9.

## Credentials still required

- Supabase project (URL, anon key, service-role key)
- Razorpay merchant account (key ID, secret, webhook secret)
- Resend account + verified sending domain (or swap `sendEmail()` for your SMTP provider)
- Real Instagram, Facebook and YouTube URLs (`site.social`) and the WhatsApp Support number (`site.whatsapp`)

## Asset manifest

All images in `public/images/` are **provisional crops taken from the supplied design screenshots**. They are low resolution (≈250–700 px wide) and some are AI-rendered mockups — replace them with real, licensed photography of RESHMAM’s actual packaging and facility before launch. Keep the filenames (or update references) to swap without code changes.

| File | Used for | Needed |
|---|---|---|
| `logo.png`, `logo-mark.png`, `logo-mark-white.png` | Header, footer, favicon | Vector (SVG) logo + favicon set |
| `product-{gingelly,groundnut,coconut,castor}.webp` | Product cards, categories, PDP | Real product photos, ~1200×830, plain/cream background |
| `pack-{gingelly,groundnut,coconut,combo}.webp` | Family packs, gift combo | Real pack photos |
| `home-hero.webp`, `hero-products.webp`, `health-hero.webp`, `contact-hero.webp` | Page heroes | ~2000×1000 lifestyle shots |
| `story-hero.webp` | Our Story hero, home story block | Real chekku photo |
| `video-process.webp`, `video-story.webp` | Video posters | Posters + the actual videos (MP4/YouTube) |
| `bts-extraction/farm/quality.webp` | Behind the Scenes | Real facility photos |
| `health-meal.webp`, `use-{cooking,salad,skin}.webp`, `banner-{health,story}-{left,right}.webp`, `bulk-*.webp` | Health/usage/banners | Licensed food & lifestyle photography |

## Content that is placeholder (clearly labelled on the site)

- **Testimonials** — labelled “Sample testimonials — not verified customer reviews”. Replace with real reviews (with permission).
- **Blog** — four sample articles, labelled “Sample”, `noindex`, excluded from the sitemap.
- **Prices / middle sizes / stock** — range ends match the screenshots; 1 L prices and stock counts are placeholders (e.g. Castor 5 L is seeded out of stock to demonstrate that state).
- No ratings, certifications or medical claims are invented. Health copy is framed as traditional use / balanced diet with a visible disclaimer; castor oil is marked external-use-only everywhere.

# RESHMAM Natural Goodness

*Pure Oils. Brighter Days.*

Online store and back-office for **RESHMAM**, a maker of traditional cold-pressed (chekku) oils —
gingelly (sesame), groundnut and coconut oil, family packs and gift combos — sold through two branches: **Velum Mayilum** and **Reshmam**.

This repository is a single **Next.js 16** app (React 19, Tailwind 4) with two parts:

| Part | URL | Code | What it is | Status |
|---|---|---|---|---|
| **Storefront** | `/` | `src/app/(storefront)/` | Customer-facing ecommerce site (TypeScript · Supabase · Razorpay · Resend) | Fully browsable without keys; orders, payments, accounts and enquiries go live once credentials are added |
| **Admin panel** | `/admin` | `src/app/admin/` | Internal dashboard for staff (JavaScript · Recharts) | Complete frontend running on sample data saved in the browser; backend not connected yet |

---

## Quick start

Requires **Node.js ≥ 20.9** and npm (Node 22 is used in CI; see `.nvmrc`). `npm run db:seed:generate` needs
Node ≥ 22.18, which runs TypeScript files directly.

```bash
npm install
cp .env.example .env.local   # optional, the site runs without any keys
npm run dev
```

- Storefront: http://localhost:3000
- Admin panel: http://localhost:3000/admin

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm test` | Unit and database tests (Vitest; the database tests run every migration on an in-memory Postgres) |
| `npm run db:seed:generate` | Rebuild `supabase/seed.sql` from the product catalogue |

The admin login screen lists the demo accounts (Admin, Manager and Staff roles). They are sample
credentials for the local demo only.

---

## Storefront (`/`)

A responsive shop built on the Next.js App Router.

- **Catalogue**: products with size variants, category filters, search, product pages, wishlist and
  a cart that survives a page reload.
- **Checkout**: prices are recalculated on the server from variant IDs. Cash-on-delivery orders and
  Razorpay online payments are supported, with signature and amount verification plus a webhook. Payments that
  can't be matched to an open order are kept in a `payment_issues` table for staff.
- **Orders**: a confirmation page and order tracking by order number and email.
- **Accounts**: Supabase magic-link sign-in, order history, and a cart and wishlist saved to the account so
  they follow the customer across devices (guests keep them in the browser).
- **Enquiries**: contact and bulk-order forms with validation, a honeypot field, a timing check and
  rate limiting. Submissions are stored in Supabase and/or emailed via Resend.
- **Content**: Our Story, Health Benefits, blog, FAQ and a help centre with the shipping, returns,
  privacy, terms and cancellation policies.
- **Chat assistant**: a rule-based shopping helper on every page. It answers only from the
  catalogue, the offers and the FAQ, and can hand off to WhatsApp.
- **SEO**: sitemap, robots.txt, JSON-LD and Open Graph.

Without credentials, features that need a backend show an honest "not connected yet" message instead
of pretending to work.

**Backend:** a Supabase Postgres schema in `supabase/migrations/` has 13 tables, all with
row-level security: categories, products, product variants, inventory movements, customers, addresses,
orders, order items, wishlists, carts, contact and bulk enquiries, and blog articles. Orders are
written by database functions that run in one transaction (`place_order`, `mark_order_paid`, `mark_order_failed`), and
`commit_order_stock()` refuses to sell more than is in stock. `supabase/seed.sql` is generated from
`src/app/(storefront)/_lib/products.ts` by `npm run db:seed:generate`.

→ See [`docs/storefront.md`](docs/storefront.md) for setup of Supabase, Razorpay and Resend, the
security model, where to edit content, and the list of placeholder assets.

## Admin panel (`/admin`)

A dashboard for running the store, served by the same Next.js app under `/admin` with its own
layout and stylesheet. Its pages are client components, because its data lives in the browser for now. It has these modules:

- **Dashboard**: KPIs, sales trends, top products and branch performance, filterable by date range.
- **Products**: catalogue management with images, variants and price-change history.
- **Prices**: branch-wise pricing per product and size, including bulk price updates.
- **Inventory**: stock levels, adjustments, transfers between branches and a movement log.
- **Orders**: status updates with a timeline, refunds, and invoices (print and PDF).
- **Branches**: branch details and performance per branch.
- **Customers**: customer list, profiles and order history.
- **Marketing**: coupons, campaigns and banners.
- **WhatsApp automation**: connection settings, message templates with a phone preview,
  automations and logs.
- **AI chatbot**: a flow builder, knowledge base, conversations, analytics and a test simulator.
- **Reports**: export to CSV, Excel or PDF.
- **Settings**: store, commerce, tax, shipping, payment and integration settings, plus team members
  and role permissions.

Every module works end to end on generated sample data: about 360 orders across both branches.
Changes are saved to `localStorage`. **Settings → Danger zone → Reset demo data** restores the
original data. Any feature that would call an outside service (WhatsApp, AI, Razorpay refunds or
email) is clearly labelled as simulated.

→ See [`docs/admin.md`](docs/admin.md) for the data model and the backend plan, and
[`docs/admin-conventions.md`](docs/admin-conventions.md) for the UI kit and the rules for building pages.

---

## How the storefront and admin relate

```
                  ┌───────────── Next.js app ─────────────┐
  Customers ────▶ │  /         storefront + /api routes   │ ──▶ Razorpay (payments)
                  │                                       │ ──▶ Resend (enquiry emails)
  Staff ────────▶ │  /admin    admin panel                │   today: sample data in localStorage
                  └───────────────────┬───────────────────┘
                                      │  storefront today, admin planned
                                      ▼
                          Supabase (Postgres + Auth)
```

Both parts are deployed together, but they **do not share data yet**. The storefront talks to
Supabase when it is configured. The admin panel keeps all of its reads and writes in
`src/app/admin/_lib/store.js`, so connecting it means replacing those action bodies with calls to
the same Supabase project, through server code in this app (route handlers or server actions)
wherever a secret is needed.

Both parts model prices and stock **per variant** (product × size, and per branch in the admin).
That data model will need to be lined up when the admin panel is connected.

## Repository layout

Each part lives in one folder, and each page's code sits next to its URL:

```
reshmam/
├── src/
│   ├── app/
│   │   ├── layout.tsx            shared <html> shell
│   │   ├── not-found.tsx  robots.ts  sitemap.ts
│   │   │
│   │   ├── (storefront)/         EVERYTHING for the customer site, served at /
│   │   │   ├── layout.tsx  page.tsx  globals.css
│   │   │   ├── products/  cart/  checkout/  blog/  contact/  …   one folder per page
│   │   │   ├── api/              checkout, payments, orders, contact  → /api/…
│   │   │   ├── _components/      shared storefront UI: layout, products, cart, chat, sections, ui
│   │   │   └── _lib/             catalogue, site config, pricing, validation, server integrations
│   │   │
│   │   └── admin/                EVERYTHING for the staff panel, served at /admin
│   │       ├── layout.tsx  page.tsx  Dashboard.jsx  admin.css
│   │       ├── login/
│   │       ├── products/         page.tsx + ProductList, ProductForm, ProductDetails, … side by side
│   │       ├── orders/  inventory/  reports/  settings/  …   one folder per module
│   │       ├── _components/      admin layout, UI kit, charts, AdminApp
│   │       ├── _lib/             data store, auth, seed data, selectors, utils, navigation
│   │       └── _assets/          logos and sample product images
│   │
│   └── proxy.ts                  returns a real 404 for unknown product and blog URLs
├── public/                       storefront images; admin favicon in public/admin/
├── supabase/                     migrations and the generated seed
├── scripts/                      seed generator
└── docs/                         storefront and admin guides
```

- `(storefront)` has brackets so it is served at `/` rather than `/storefront`.
- Folders starting with `_` hold shared code. Next.js never turns them into pages.
- Imports use `@storefront/…` and `@admin/…`, for example
  `import { useDb } from '@admin/_lib/store'`.

## Configuration

The storefront reads these environment variables, and `ENABLE_ADMIN_DEMO` decides whether a production server
shows the admin demo. Set them **before** `npm run build`: the `NEXT_PUBLIC_*` values and the security headers
are fixed at build time. Copy `.env.example` to `.env.local` and fill in:

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, Open Graph |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database and customer sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access. Never expose it to the browser |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Online payments |
| `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, `ENQUIRY_TO_EMAIL` | Enquiry notification emails |

Never commit `.env.local` or any real secret.

## Before launch

- [ ] Create the Supabase project, apply the migrations and run the seed
- [ ] Add the Razorpay keys and webhook — events `payment.captured`, `order.paid`, `payment.failed` (test first, then live)
- [ ] Set every variable from `.env.example` **before** `npm run build` (the `NEXT_PUBLIC_*` values and the security headers are fixed at build time)
- [ ] Decide whether the public site should hide the admin demo (`DISABLE_ADMIN_DEMO=1` answers `/admin` with a 404); it is served by default
- [ ] Set up Resend with a verified sending domain
- [ ] Replace the provisional images in `public/images/` with real, licensed photos
- [ ] Replace the sample testimonials and blog posts, and confirm the placeholder prices and stock
- [ ] Add the real Instagram/Facebook links and marketplace listing URLs in `src/app/(storefront)/_lib/site.ts`
- [ ] Connect the admin panel to Supabase, using Supabase Auth and roles instead of the demo users
- [ ] Move the WhatsApp, AI and refund integrations behind server-side endpoints

## Contributing

Branch off `master` and name the branch `<type>/<short-description>`:

| Prefix | Use for |
|---|---|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Code changes with no change in behaviour |
| `test/` | Tests |
| `chore/` | Tooling, dependencies, config |
| `perf/` | Performance |
| `ci/` | CI / workflows |

Run `npm run lint`, `npm test` and `npm run build` before opening a pull request into `master`.

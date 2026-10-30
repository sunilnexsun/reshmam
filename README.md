# RESHMAM Natural Goodness

*Pure Oils. Brighter Days.*

Online store and back-office for **RESHMAM**, a maker of traditional cold-pressed (chekku) oils —
gingelly (sesame), groundnut, coconut and castor oil, family packs, gift combos and gingelly oil cake
for cattle feed — sold through two branches: **Velum Mayilum** and **Reshmam**.

This repository holds two independent apps:

| App | Folder | What it is | Stack | Status |
|---|---|---|---|---|
| **Storefront** | [`website/`](website/) | Customer-facing ecommerce site | Next.js 16 · React 19 · TypeScript · Tailwind 4 · Supabase · Razorpay · Resend | Fully browsable without keys; orders, payments, accounts and enquiries go live once credentials are added |
| **Admin panel** | [`admin/`](admin/) | Internal dashboard for staff | Vite 8 · React 19 · JavaScript · Tailwind 4 · Recharts | Complete frontend running on sample data saved in the browser; backend not connected yet |

---

## Quick start

Requires **Node.js ≥ 20.9** and npm. Each app has its own `package.json` and is installed separately.

**Storefront**: http://localhost:3000

```bash
cd website
npm install
cp .env.example .env.local   # optional, the site runs without any keys
npm run dev
```

**Admin panel**: http://localhost:5173

```bash
cd admin
npm install
npm run dev
```

The admin login screen lists the demo accounts (Admin, Manager and Staff roles). They are sample
credentials for the local demo only.

---

## Storefront (`website/`)

A responsive shop built on the Next.js App Router.

- **Catalogue**: products with size variants, category filters, search, product pages, wishlist and
  a cart that survives a page reload.
- **Checkout**: prices are recalculated on the server from variant IDs. Cash-on-delivery orders and
  Razorpay online payments are supported, with signature and amount verification plus a webhook.
- **Orders**: a confirmation page and order tracking by order number and email.
- **Accounts**: Supabase magic-link sign-in.
- **Enquiries**: contact and bulk-order forms with validation, a honeypot field, a timing check and
  rate limiting. Submissions are stored in Supabase and/or emailed via Resend.
- **Content**: Our Story, Health Benefits, blog, FAQ and a help centre with the shipping, returns,
  privacy, terms and cancellation policies.
- **Chat assistant**: a rule-based shopping helper on every page. It answers only from the
  catalogue, the offers and the FAQ, and can hand off to WhatsApp.
- **SEO**: sitemap, robots.txt, JSON-LD and Open Graph.

Without credentials, features that need a backend show an honest "not connected yet" message instead
of pretending to work.

**Backend:** a Supabase Postgres schema in `website/supabase/migrations/` has 13 tables, all with
row-level security: categories, products, product variants, inventory movements, customers, addresses,
orders, order items, wishlists, carts, contact and bulk enquiries, and blog articles. Stock is reduced
by an idempotent `commit_order_stock()` function. `supabase/seed.sql` is generated from
`src/lib/products.ts` by `npm run db:seed:generate`.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run db:seed:generate` | Rebuild `supabase/seed.sql` from the product catalogue |

→ See [`website/README.md`](website/README.md) for setup of Supabase, Razorpay and Resend, the
security model, where to edit content, and the list of placeholder assets.

## Admin panel (`admin/`)

A single-page dashboard (HashRouter) for running the store. It has these modules:

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

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Static production build in `dist/` |
| `SINGLE_FILE=1 npm run build` | One self-contained `dist/index.html` for sharing a preview |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |

→ See [`admin/README.md`](admin/README.md) for the data model and the backend plan, and
[`admin/CONVENTIONS.md`](admin/CONVENTIONS.md) for the UI kit and the rules for building pages.

---

## How the two apps relate

```
                  ┌──────────────────────────┐
  Customers ────▶ │  website/  (Next.js)     │ ──▶ Razorpay (payments)
                  │  storefront + API routes │ ──▶ Resend (enquiry emails)
                  └────────────┬─────────────┘
                               │
                               ▼
                       Supabase (Postgres + Auth)
                               ▲
                               ┆  planned (not wired up yet)
                  ┌────────────┴─────────────┐
  Staff ────────▶ │  admin/  (Vite + React)  │   today: sample data in localStorage
                  └──────────────────────────┘
```

The two apps **do not share any code or data yet**. The storefront talks to Supabase when it is
configured. The admin panel keeps all of its reads and writes in `admin/src/services/store.js`, so
connecting it means replacing those action bodies with API calls to the same Supabase project.

Both apps model prices and stock **per variant** (product × size, and per branch in the admin). That
data model will need to be lined up when the admin panel is connected.

## Repository layout

```
reshmam/
├── website/                 Storefront (Next.js)
│   ├── src/app/             pages and API routes (checkout, payments, orders, contact)
│   ├── src/components/      layout, products, cart, chat, sections, ui
│   ├── src/lib/             catalogue, site config, pricing, validation, server integrations
│   ├── supabase/            migrations and the generated seed
│   └── scripts/             seed generator
└── admin/                   Admin panel (Vite + React)
    ├── src/pages/           one folder per module
    ├── src/components/      layout, UI kit, chart styling
    ├── src/services/        store (data layer), selectors, auth
    ├── src/data/seed.js     sample data generator
    └── src/utils/           formatting, date ranges, exports, image resizing
```

## Configuration

Only the storefront reads environment variables. Copy `website/.env.example` to
`website/.env.local` and fill in:

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
- [ ] Add the Razorpay keys and webhook (test first, then live)
- [ ] Set up Resend with a verified sending domain
- [ ] Replace the provisional images in `website/public/images/` with real, licensed photos
- [ ] Replace the sample testimonials and blog posts, and confirm the placeholder prices and stock
- [ ] Add real social media links and the WhatsApp number in `website/src/lib/site.ts`
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

Run the app's linter (`npm run lint`) and build before opening a pull request into `master`.

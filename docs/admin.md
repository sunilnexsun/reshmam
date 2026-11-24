# RESHMAM Admin Panel

Served at `/admin` by the same Next.js app as the storefront. Admin panel for the RESHMAM Natural Goodness store: products, branch-wise pricing, inventory,
orders, customers, marketing, WhatsApp automation, AI chatbot, reports and settings.

**Current version: fully working frontend with sample data.** Every screen works — forms validate,
records are created/edited/deleted, stock and prices update, charts recalculate — and all changes are
saved in the browser (localStorage). Nothing is sent to a server yet, and features that depend on
outside services (WhatsApp Cloud API, AI provider, Razorpay refunds, email) are clearly marked as
simulated until the backend is connected.

## Run it

From the repository root:

```bash
npm install
npm run dev          # http://localhost:3000/admin
npm run build        # production build of the whole app (storefront + admin)
```

**Signing in.** Staff sign in with their email and password through Firebase Auth. Each staff member has a
record at `adminUsers/{their Firebase uid}` with a role (Admin, Manager, Staff, or a custom role). What each
role may see and change is set in **Settings → Roles** and enforced by the Firestore rules and the admin API
(`src/lib/staff-permissions.ts`); the Admin role always has full access. New staff are added in
**Settings → User Management**, which creates their Firebase account and gives a reset link to set their own
password. "Forgot Password?" on the login screen sends Firebase's reset email. Passwords are never stored in
Firestore or the browser.

Staff created before this change (with passwords in Firestore) are moved over once by
`scripts/migrate-admin-users.mjs`; see [`firebase-go-live.md`](firebase-go-live.md) step 4.

Settings → Danger zone → **Reset demo data** restores the original sample data.

If the browser's storage fills up (images are stored in it), changes can no longer be saved: a red banner
says so across the top of every page until a save succeeds again.

**Orders and invoices.** An invoice is issued when an order is first confirmed (moved to Processing) and keeps
that moment's invoice number, date, seller details and tax settings; reprints never change. Pending orders
have no invoice yet. With *Charge GST* off (Settings → Tax), new invoices are issued as a *Bill of Supply*
without GST. An online order whose payment is pending or failed can only be cancelled.

## Structure

Everything lives in `src/app/admin/`. Each module's code sits next to its route: the `page.tsx`
files only render a component from the same folder. Imports use `@admin/…`.

```
src/app/admin/
  layout.tsx              admin <head> metadata, styles and AdminApp
  page.tsx, Dashboard.jsx /admin
  login/                  /admin/login (no sidebar)
  products/               /admin/products, /new, /[id], /[id]/edit + ProductList, ProductForm, ProductDetails…
  orders/ price-management/ inventory/ branches/ customers/ marketing/
  whatsapp/ ai-chatbot/ reports/ settings/      one folder per module, same pattern
  [...slug]/              "Page not found" inside the panel
  admin.css               Tailwind tokens and component classes (scans only this folder)
  _components/
    AdminApp.jsx          client root: toast, confirm and auth providers + the sidebar shell; renders only in the browser
    NotFound.jsx          empty state for missing pages and records
    layout/               AdminLayout, Sidebar (collapsible, mobile drawer), Header (search, notifications, profile)
    ui/                   Button, Card, DataTable, Modal, Toast, Confirm, Tabs, StatCard, ImageUploader, form fields…
    charts/               shared Recharts styling, Donut, dashboard widgets reused by Reports
  _lib/
    store.js              the data layer – reads and writes go through it (orderActions.js and productActions.js add
                          module actions on top of it)
    selectors.js          derived data (KPIs, sales series, low stock, notifications…)
    auth.jsx              login, sessions, role permissions
    seed.js               sample data generator (branches, products, variants, 360 orders, customers…)
    navigation.jsx        Link, NavLink, useNavigate, useSearchParams… with paths relative to /admin
    format.js dateRange.js export.js image.js useNow.js useUrlState.js orderActions.js productActions.js
  _assets/                logos and sample product images
```

Data model: `products` hold catalogue details; **prices and stock live on `variants`** — one per
product × branch × size — which is what makes branch-wise pricing and inventory work.
Every price change is written to `priceHistory`; every stock change to `stockMovements`.

## Connecting the backend (next phase)

Pages never touch storage directly; they call the actions in `src/app/admin/_lib/store.js`
(`saveProduct`, `updateVariant`, `adjustStock`, `transferStock`, `updateOrderStatus`, `recordOrderRefund` in `_lib/orderActions.js`, …).
To go live, replace the body of each action with an API call and load `useDb()` data from the API.

Recommended: **Supabase** (Postgres + Auth + Storage), matching the storefront. Anything that needs a
secret runs as server code in this app (route handlers or server actions), next to the storefront's
existing API routes.

| Concern | Frontend today | Backend |
|---|---|---|
| Auth & roles | Firebase Auth (email/password); roles in `configs/settings`, enforced by Firestore rules and `/api/admin/*` | done |
| Data | localStorage | Postgres tables mirroring `seed.js` collections |
| Images | resized to data URLs in the browser | Supabase Storage bucket, store URLs |
| Stock moves / transfers | client-side action | Postgres function in a transaction (no negative stock) |
| Refunds | recorded as "Pending gateway" | Razorpay Refunds API from the server, then mark processed via webhook |
| WhatsApp | config form, template editor, simulated test sends | Meta WhatsApp Cloud API from the server; webhook updates delivery status |
| AI chatbot | rule-based simulator using flows + knowledge base | server-side LLM call with the knowledge base; API key in server env |
| Exports | generated in the browser | unchanged (or server-side for very large reports) |

Secrets (WhatsApp access token, AI API key, Razorpay key secret, webhook secrets) must live in server
environment variables only.

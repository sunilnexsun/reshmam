# RESHMAM Admin Panel

Admin panel for the RESHMAM Natural Goodness store: products, branch-wise pricing, inventory,
orders, customers, marketing, WhatsApp automation, AI chatbot, reports and settings.

**Current version: fully working frontend with sample data.** Every screen works — forms validate,
records are created/edited/deleted, stock and prices update, charts recalculate — and all changes are
saved in the browser (localStorage). Nothing is sent to a server yet, and features that depend on
outside services (WhatsApp Cloud API, AI provider, Razorpay refunds, email) are clearly marked as
simulated until the backend is connected.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/ (static, deploy anywhere)
SINGLE_FILE=1 npm run build   # one self-contained dist/index.html (for sharing a preview)
```

Demo logins (also shown on the login screen):

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Admin   | admin@reshmam.com     | Admin@123    |
| Manager | manager@reshmam.com   | Manager@123  |
| Staff   | staff@reshmam.com     | Staff@123    |

Settings → Danger zone → **Reset demo data** restores the original sample data.

## Structure

```
src/
  App.jsx                 routes (HashRouter)
  components/
    layout/               AdminLayout, Sidebar (collapsible, mobile drawer), Header (search, notifications, profile)
    ui/                   Button, Card, DataTable, Modal, Toast, Confirm, Tabs, StatCard, ImageUploader, form fields…
    charts/               shared Recharts styling
  data/seed.js            sample data generator (branches, products, variants, 360 orders, customers…)
  services/
    store.js              the data layer – every read/write goes through here
    selectors.js          derived data (KPIs, sales series, low stock, notifications…)
    auth.jsx              login, sessions, role permissions
  pages/                  one folder per module
  utils/                  formatting, date ranges, CSV/Excel/PDF export, image resizing
```

Data model: `products` hold catalogue details; **prices and stock live on `variants`** — one per
product × branch × size — which is what makes branch-wise pricing and inventory work.
Every price change is written to `priceHistory`; every stock change to `stockMovements`.

## Connecting the backend (next phase)

Pages never touch storage directly; they call the actions in `src/services/store.js`
(`saveProduct`, `updateVariant`, `adjustStock`, `transferStock`, `updateOrderStatus`, `recordRefund`, …).
To go live, replace the body of each action with an API call and load `useDb()` data from the API.

Recommended: **Supabase** (Postgres + Auth + Storage), matching the storefront.

| Concern | Frontend today | Backend |
|---|---|---|
| Auth & roles | demo users in settings, plain-text demo passwords | Supabase Auth; roles table + RLS; never store passwords client-side |
| Data | localStorage | Postgres tables mirroring `seed.js` collections |
| Images | resized to data URLs in the browser | Supabase Storage bucket, store URLs |
| Stock moves / transfers | client-side action | Postgres function in a transaction (no negative stock) |
| Refunds | recorded as "Pending gateway" | Razorpay Refunds API from the server, then mark processed via webhook |
| WhatsApp | config form, template editor, simulated test sends | Meta WhatsApp Cloud API from the server; webhook updates delivery status |
| AI chatbot | rule-based simulator using flows + knowledge base | server-side LLM call with the knowledge base; API key in server env |
| Exports | generated in the browser | unchanged (or server-side for very large reports) |

Secrets (WhatsApp access token, AI API key, Razorpay key secret, webhook secrets) must live in server
environment variables only.

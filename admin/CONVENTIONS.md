# RESHMAM Admin – conventions for module pages

Stack: React 19 + Vite, Tailwind 4 (tokens in `src/index.css`), react-router-dom 7 (**HashRouter**),
react-hook-form, Recharts 3, lucide-react. Plain JSX (no TypeScript). **The finished reference page is
`src/pages/customers/` (CustomerList, CustomerDetails, CustomerFormModal) — copy its patterns.**

## Data
- `useDb()` from `src/services/store.js` returns the whole database (stable until something changes).
  Derive with `useMemo(() => …, [db])`. Never mutate it.
- Shape: see `src/data/seed.js` → `branches, products, variants, customers, orders, stockMovements,
  priceHistory, coupons, campaigns, banners, whatsapp{config,templates,automations,logs},
  chatbot{settings,flows,knowledge,conversations}, settings{general,company,notifications,tax,payment,
  shipping,users,roles}, activities, readNotifications`.
  - Products hold catalogue info; **prices/stock live on `variants`** (one per product × branch × size).
  - Order items: `{productId, variantId, name, size, sku, qty, price, mrp, gst, total}` – no image; use
    `productImage(db, productId)` from selectors.
- Writes ONLY through store actions (each persists to localStorage and re-renders everything):
  - generic: `createItem(col, data, prefix)`, `updateItem(col, id, patch)`, `removeItem(col, id)`,
    `updateSection('settings.tax', patch)`; `col` may be a path like `'whatsapp.templates'`.
  - domain: `saveProduct(product, variants?)`, `deleteProduct`, `updateVariant(id, patch, note)` (records
    priceHistory + stock adjustments), `addVariant`, `removeVariant`, `adjustStock({variantId,type,qty,reference,notes,date})`
    (throws on negative stock; type `Adjustment` = set absolute level), `transferStock({fromBranchId,toBranchId,variantId,qty,date,notes})`,
    `updateOrderStatus(orderId, status, note, extra)` (timeline + auto restock on Cancelled/Returned),
    `recordRefund(orderId,{amount,reason})`, `logActivity(type, message)`, `resetDemoData()`.
  - If a module needs a new domain action, add it to `store.js` in a clearly separated block at the end
    with your module name in a comment; do not change existing actions' behaviour.
- Derived helpers in `src/services/selectors.js`: `byId, productRows, inventoryRows, lowStock, stockStatus,
  isRevenue, ordersIn, kpis, salesSeries, topProducts(orders, n, db), branchPerformance, categorySales,
  customerStats, productImage, notifications`. Date presets: `src/utils/dateRange.js`
  (`resolveRange, previousRange, inRange, growth, RANGE_PRESETS`).
- Formatting: `src/utils/format.js` (`inr, inrShort, num, pct, date, dateTime, timeAgo, uid, cn, …`).
  Exports: `src/utils/export.js` (`exportCSV, exportExcel, exportPDF, rs`, raw `jsPDF/autoTable`).
  jsPDF fonts lack "₹" → use `rs(n)` ("Rs. 1,234") in PDFs.
- Permissions: `const { can, user } = useAuth()` → `can('orders','manage')` gates edit buttons
  (modules: dashboard, products, orders, prices, inventory, branches, customers, marketing, whatsapp,
  chatbot, reports, settings). View-only users must still see the page.

## UI kit (`src/components/ui`)
`Button` (variant primary|accent|secondary|outline|ghost|danger|danger-outline, size sm|md|lg, icon,
`as="link" to=…` for router links, `as="a" href=…` for external), `IconButton` (needs `label`),
`Card` (title, subtitle, actions, bodyClassName – pass `"p-0"` for tables), `Badge`, `StatusBadge`
(knows all order/payment/stock/template statuses), `Field`+`Input`/`Select`/`Textarea` (forwardRef →
`{...register('x', rules)}`; pass `error={errors.x}` to Field and Input), `FilterSelect` (toolbar filter
with `allLabel` → value `'all'`), `Toggle`, `Checkbox`, `SearchInput`, `PageHeader` (title, subtitle,
breadcrumbs `[{label,to}]`, actions), `EmptyState`, `Avatar`, `Thumb` (product image), `InfoList`
(`[[label,value]]`), `DemoNote` (amber note for simulated features), `Modal` (open,onClose,title,size
sm|md|lg|xl|full, footer), `useToast()` (`toast.success/error/info/warning`), `useConfirm()`
(`await confirm({title,message,confirmText,tone})` – use for every delete/destructive action),
`Dropdown`, `DataTable` (columns `{key,label,render,sortable,sortValue,align}`; built-in sort +
pagination; `onRowClick`; `selectable/selected/onSelect`), `Pagination`, `Tabs` ({value,label,icon,count}),
`StatCard` (label,value,change %,icon,tone primary|blue|amber|purple|red|teal,hint,onClick),
`ImageUploader`, `DateRangeFilter` (`{preset,from,to}`), `Segmented`.
Charts: `src/components/charts` → `CHART_COLORS, AXIS, GRID, moneyAxis, ChartTooltip`. Always wrap in
`<ResponsiveContainer width="100%" height={280}>`.

## Page rules
- Every page starts with `<PageHeader title breadcrumbs actions />`. Layout grid gaps `gap-6`; stat rows
  `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`. Tables live in `<Card bodyClassName="p-0">` with a
  toolbar `div.flex … border-b border-line p-4` (search left, filters right) like CustomerList.
- Keep filter state in the URL (`useSearchParams`) so links like `/inventory?q=Castor` work.
- Forms: react-hook-form with validation messages; disable submit while submitting; toast on success;
  never silently fail. Destructive actions → `useConfirm`. Modals for small forms; full pages for big ones.
- Responsive: must work at 375px (stack, `min-w-0`, tables scroll horizontally inside their card). No
  page-level horizontal scroll.
- Honesty: this is a frontend with SAMPLE data. Anything that would talk to an external service
  (WhatsApp Cloud API, AI provider, Razorpay refunds, email) must NOT pretend it succeeded: mark results
  as "Simulated"/"Test (not sent)" and show a `DemoNote` explaining the backend hook needed. No invented
  ratings, reviews, certifications or health claims.
- Accessibility: buttons have text or `aria-label`; inputs have labels; colour is never the only signal.
- No new npm dependencies without need. No `console.log`. Run `npx oxlint src` and `npx vite build`
  before finishing – both must pass with no errors.

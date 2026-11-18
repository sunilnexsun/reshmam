// Report builders. Each returns { title, rows, columns, ...chartData } for one tab.
// Columns double as DataTable columns and export columns:
//   { key, label, render?, sortable?, align?, kind?: 'money'|'pct'|'num'|'text', exp?(row) }
import { Link } from '@admin/_lib/navigation'
import { Badge, StatusBadge, Thumb } from '@admin/_components/ui'
import { byId, categorySales, inventoryRows, isRevenue, kpis, netRevenue, revenueShare, stockStatus } from '@admin/_lib/selectors'
import { date, inr, num } from '@admin/_lib/format'
import { rs } from '@admin/_lib/export'
import { colorFor, SERIES, STATUS_COLORS, STATUS_ORDER, timeSeries, trailingRange, unitFor } from '@admin/_components/charts/chartKit'

export const DEFAULT_COST_PCT = 65

// ---------------------------------------------------------------- column helpers
const money = (key, label, extra = {}) => ({ key, label, sortable: true, align: 'right', kind: 'money', render: (r) => inr(r[key]), ...extra })
const count = (key, label, extra = {}) => ({ key, label, sortable: true, align: 'right', kind: 'num', render: (r) => num(r[key]), ...extra })
const share = (key, label, extra = {}) => ({ key, label, sortable: true, align: 'right', kind: 'pct', render: (r) => `${(r[key] || 0).toFixed(1)}%`, ...extra })
const text = (key, label, extra = {}) => ({ key, label, sortable: true, kind: 'text', className: 'whitespace-nowrap', ...extra })

const productCell = (r) => (
  <div className="flex min-w-[240px] items-center gap-3 whitespace-normal">
    <Thumb src={r.image} alt={r.name} size={36} />
    <div className="min-w-0"><p className="font-medium text-ink">{r.name}</p><p className="text-xs text-muted">{r.category}</p></div>
  </div>
)

/** Export value of a column for a row (raw numbers for CSV/Excel). */
export const exportValue = (c, r) => (c.exp ? c.exp(r) : r[c.key])
const PDF_SAFE = (s) => String(s ?? '').replace(/[–—]/g, '-').replace(/₹\s?/g, 'Rs. ').replace(/×/g, 'x').replace(/[^\x20-\x7E]/g, '')
/** Export columns: raw for spreadsheets, formatted + ASCII-safe for PDF. */
export function exportColumns(columns, forPdf) {
  return columns.filter((c) => c.exp !== false && c.kind).map((c) => ({
    label: c.kind === 'money' && !forPdf ? `${c.label} (INR)` : c.kind === 'pct' && !forPdf ? `${c.label} (%)` : c.label,
    value: (r) => {
      const v = exportValue(c, r)
      if (!forPdf) return c.kind === 'pct' || c.kind === 'money' ? Math.round((Number(v) || 0) * 100) / 100 : v
      if (c.kind === 'money') return rs(Math.round(v))
      if (c.kind === 'pct') return `${(Number(v) || 0).toFixed(1)}%`
      if (c.kind === 'num') return new Intl.NumberFormat('en-IN').format(Number(v) || 0)
      return PDF_SAFE(v)
    },
  }))
}

// ---------------------------------------------------------------- shared aggregations
function productAgg(orders) {
  const m = new Map()
  orders.filter(isRevenue).forEach((o) => {
    const discRatio = o.subtotal ? (o.discount || 0) / o.subtotal : 0
    const share = revenueShare(o)
    o.items.forEach((it) => {
      const r = m.get(it.productId) || { qty: 0, revenue: 0, orders: new Set(), netExGst: 0 }
      r.qty += it.qty; r.revenue += it.total * share; r.orders.add(o.id)
      r.netExGst += (it.total * share * (1 - discRatio)) / (1 + (it.gst || 0) / 100)
      m.set(it.productId, r)
    })
  })
  return m
}
const scopeProducts = (db, branch) => (branch === 'all' ? db.products : db.products.filter((p) => db.variants.some((v) => v.productId === p.id && v.branchId === branch)))
export const allCategories = (db) => [...new Set([...(db.categories || []).map((c) => c.name), ...db.products.map((p) => p.category)])]

// ---------------------------------------------------------------- Sales
export function salesReport({ db, orders, range, branch }) {
  const unit = unitFor(range)
  const inBranch = db.orders.filter((o) => branch === 'all' || o.branchId === branch)
  const rows = timeSeries(orders, range, unit)
  return {
    title: 'Sales Report', unit, rows,
    trend: rows,
    monthly: timeSeries(inBranch, trailingRange('month', 12), 'month'),
    columns: [
      text('key', unit === 'month' ? 'Month' : unit === 'week' ? 'Week starting' : 'Date', { render: (r) => r.label, exp: (r) => r.label, sortValue: (r) => r.key }),
      count('orders', 'Orders'),
      count('cancelled', 'Cancelled / Returned'),
      count('items', 'Units Sold'),
      money('discount', 'Discounts'),
      money('tax', 'GST (incl.)'),
      money('revenue', 'Revenue', { render: (r) => <b>{inr(r.revenue)}</b> }),
      money('aov', 'Avg Order'),
    ],
    rowKey: 'key',
  }
}

// ---------------------------------------------------------------- Products
export function productReport({ db, orders, branch }) {
  const agg = productAgg(orders)
  const total = [...agg.values()].reduce((s, r) => s + r.revenue, 0)
  const rows = scopeProducts(db, branch).map((p) => {
    const a = agg.get(p.id) || { qty: 0, revenue: 0, orders: new Set() }
    const vs = db.variants.filter((v) => v.productId === p.id && (branch === 'all' || v.branchId === branch))
    return { id: p.id, name: p.name, sku: p.sku, category: p.category, brand: p.brand, status: p.status, image: p.images?.[p.primaryImage || 0] || p.images?.[0], qty: a.qty, orders: a.orders.size, revenue: a.revenue, share: total ? (a.revenue / total) * 100 : 0, avgPrice: a.qty ? a.revenue / a.qty : 0, stock: vs.reduce((s, v) => s + v.stock, 0) }
  }).sort((a, b) => b.revenue - a.revenue)
  const cats = allCategories(db)
  return {
    title: 'Product Report', rows,
    top: rows.filter((r) => r.revenue > 0).slice(0, 8),
    categories: categorySales(db, orders).map((c) => ({ name: c.name, value: c.revenue, color: colorFor(cats, c.name) })),
    columns: [
      text('name', 'Product', { render: (r) => <Link to={`/products/${r.id}`} className="hover:text-primary">{productCell(r)}</Link>, exp: (r) => r.name }),
      text('sku', 'SKU', { render: (r) => <span className="text-xs text-muted">{r.sku}</span> }),
      text('category', 'Category'),
      count('qty', 'Units Sold'),
      count('orders', 'Orders'),
      money('avgPrice', 'Avg Price'),
      money('revenue', 'Revenue', { render: (r) => <b>{inr(r.revenue)}</b> }),
      share('share', 'Share'),
      count('stock', 'Current Stock'),
      text('status', 'Status', { render: (r) => <StatusBadge status={r.status} /> }),
    ],
  }
}

// ---------------------------------------------------------------- Inventory (current snapshot + sold in range)
export function inventoryReport({ db, orders, branch }) {
  const sold = new Map()
  orders.filter(isRevenue).forEach((o) => o.items.forEach((it) => sold.set(it.variantId, (sold.get(it.variantId) || 0) + it.qty)))
  const rows = inventoryRows(db).filter((r) => branch === 'all' || r.branchId === branch).map((r) => ({
    ...r, name: r.productName, value: r.stock * r.price, sold: sold.get(r.id) || 0, stockStatus: stockStatus(r.stock, r.alertStock),
  }))
  const cats = allCategories(db)
  const byCat = new Map()
  rows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) || 0) + r.value))
  const statusCounts = ['In Stock', 'Low Stock', 'Out of Stock'].map((s, i) => ({ name: s, value: rows.filter((r) => r.stockStatus === s).length, color: [SERIES[0], SERIES[2], SERIES[5]][i] }))
  return {
    title: 'Inventory Report', rows,
    valueByCategory: [...byCat.entries()].map(([name, value]) => ({ name, value, color: colorFor(cats, name) })).sort((a, b) => b.value - a.value),
    statusCounts,
    totals: { units: rows.reduce((s, r) => s + r.stock, 0), value: rows.reduce((s, r) => s + r.value, 0), skus: rows.length },
    columns: [
      text('name', 'Product', { render: (r) => <Link to={`/inventory?q=${encodeURIComponent(r.productName)}`} className="hover:text-primary">{productCell({ ...r, name: `${r.productName} – ${r.size}` })}</Link>, exp: (r) => `${r.productName} ${r.size}` }),
      text('sku', 'SKU', { render: (r) => <span className="text-xs text-muted">{r.sku}</span> }),
      text('branchName', 'Branch'),
      money('price', 'Price'),
      count('stock', 'Stock'),
      count('alertStock', 'Alert Level'),
      count('sold', 'Sold (period)'),
      money('value', 'Stock Value'),
      text('stockStatus', 'Status', { render: (r) => <StatusBadge status={r.stockStatus} /> }),
    ],
  }
}

// ---------------------------------------------------------------- Branches (always compares all branches)
export function branchReport({ db, allOrders, range }) {
  const total = allOrders.reduce((s, o) => s + netRevenue(o), 0)
  const days = (range.to - range.from) / 86400000
  const unit = days <= 14 ? 'day' : days <= 130 ? 'week' : 'month'
  const rows = db.branches.map((b) => {
    const os = allOrders.filter((o) => o.branchId === b.id)
    const k = kpis(os)
    const vs = db.variants.filter((v) => v.branchId === b.id)
    return { id: b.id, name: b.name, code: b.code, city: b.city, manager: b.manager, status: b.status, ...k, cancelled: os.filter((o) => !isRevenue(o)).length, share: total ? (k.revenue / total) * 100 : 0, stockValue: vs.reduce((s, v) => s + v.stock * v.price, 0), low: vs.filter((v) => v.status === 'Active' && v.stock <= v.alertStock).length }
  }).sort((a, b) => b.revenue - a.revenue)
  const ids = db.branches.map((b) => b.id)
  const series = db.branches.map((b) => ({ id: b.id, name: b.name, color: colorFor(ids, b.id), points: timeSeries(allOrders.filter((o) => o.branchId === b.id), range, unit) }))
  const trend = series[0]?.points.map((p, i) => Object.fromEntries([['label', p.label], ...series.map((s) => [s.id, s.points[i].revenue])])) || []
  return {
    title: 'Branch Report', rows, series, trend, unit,
    bars: rows.map((r) => ({ name: r.name, value: r.revenue, color: colorFor(ids, r.id) })),
    columns: [
      text('name', 'Branch', { render: (r) => <Link to={`/branches/${r.id}`} className="font-medium hover:text-primary">{r.name}</Link> }),
      text('code', 'Code'),
      text('manager', 'Manager'),
      count('orders', 'Orders'),
      count('cancelled', 'Cancelled / Returned'),
      count('customers', 'Customers'),
      money('aov', 'Avg Order'),
      money('revenue', 'Revenue', { render: (r) => <b>{inr(r.revenue)}</b> }),
      share('share', 'Share'),
      money('stockValue', 'Stock Value'),
      count('low', 'Low-stock SKUs'),
    ],
  }
}

// ---------------------------------------------------------------- Customers
export function customerReport({ db, orders, range }) {
  const firstEver = {}
  db.orders.forEach((o) => { if (!firstEver[o.customerId] || o.createdAt < firstEver[o.customerId]) firstEver[o.customerId] = o.createdAt })
  const cust = byId(db.customers)
  const m = new Map()
  orders.forEach((o) => {
    const r = m.get(o.customerId) || { id: o.customerId, name: cust[o.customerId]?.name || o.customerName, phone: cust[o.customerId]?.phone || o.customerPhone, city: cust[o.customerId]?.address?.city || o.shippingAddress?.city || '—', orders: 0, revenue: 0, revenueOrders: 0, last: o.createdAt, deleted: !cust[o.customerId] }
    r.orders += 1
    if (isRevenue(o)) { r.revenue += netRevenue(o); r.revenueOrders += 1 }
    if (o.createdAt > r.last) r.last = o.createdAt
    m.set(o.customerId, r)
  })
  const rows = [...m.values()].map((r) => ({ ...r, aov: r.revenueOrders ? r.revenue / r.revenueOrders : 0, first: firstEver[r.id], type: new Date(firstEver[r.id]) >= range.from ? 'New' : 'Returning' })).sort((a, b) => b.revenue - a.revenue)
  const cities = new Map()
  rows.forEach((r) => cities.set(r.city, (cities.get(r.city) || 0) + r.revenue))
  const newCount = rows.filter((r) => r.type === 'New').length
  return {
    title: 'Customer Report', rows,
    cities: [...cities.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
    summary: { buyers: rows.length, newCount, returning: rows.length - newCount, repeat: rows.filter((r) => r.orders > 1).length, perCustomer: rows.length ? rows.reduce((s, r) => s + r.revenue, 0) / rows.length : 0 },
    columns: [
      text('name', 'Customer', { render: (r) => r.deleted ? <span>{r.name} <Badge>Deleted</Badge></span> : <Link to={`/customers/${r.id}`} className="font-medium hover:text-primary">{r.name}</Link> }),
      text('phone', 'Phone', { sortable: false, render: (r) => <span className="whitespace-nowrap">{r.phone}</span> }),
      text('city', 'City'),
      text('type', 'Type', { render: (r) => <Badge tone={r.type === 'New' ? 'blue' : 'gray'}>{r.type}</Badge> }),
      count('orders', 'Orders'),
      money('aov', 'Avg Order'),
      money('revenue', 'Revenue', { render: (r) => <b>{inr(r.revenue)}</b> }),
      text('first', 'First Order', { render: (r) => <span className="whitespace-nowrap">{date(r.first)}</span>, exp: (r) => date(r.first) }),
      text('last', 'Last Order (period)', { render: (r) => <span className="whitespace-nowrap">{date(r.last)}</span>, exp: (r) => date(r.last) }),
    ],
  }
}

// ---------------------------------------------------------------- Orders
export function orderReport({ db, orders }) {
  const br = byId(db.branches)
  const rows = [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((o) => ({ ...o, branchName: br[o.branchId]?.name || '—', itemCount: o.items.reduce((s, it) => s + it.qty, 0) }))
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]))
  rows.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1 })
  const methods = new Map()
  rows.forEach((o) => methods.set(o.paymentMethod, (methods.get(o.paymentMethod) || 0) + 1))
  return {
    title: 'Order Report', rows,
    statusData: STATUS_ORDER.map((s) => ({ name: s, value: counts[s], color: STATUS_COLORS[s] })),
    methods: [...methods.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    columns: [
      text('number', 'Order ID', { render: (o) => <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link> }),
      text('createdAt', 'Date', { render: (o) => <span className="whitespace-nowrap">{date(o.createdAt)}</span>, exp: (o) => date(o.createdAt) }),
      text('customerName', 'Customer'),
      text('branchName', 'Branch'),
      count('itemCount', 'Units'),
      text('paymentMethod', 'Payment Method'),
      text('paymentStatus', 'Payment', { render: (o) => <StatusBadge status={o.paymentStatus} /> }),
      text('status', 'Status', { render: (o) => <StatusBadge status={o.status} /> }),
      money('discount', 'Discount'),
      money('total', 'Total', { render: (o) => <b>{inr(o.total)}</b> }),
    ],
  }
}

// ---------------------------------------------------------------- Profit (ESTIMATE — cost prices are not recorded yet)
export function profitReport({ db, orders, branch, costPct }) {
  const agg = productAgg(orders)
  const pctOf = (cat) => (Number.isFinite(costPct[cat]) ? costPct[cat] : DEFAULT_COST_PCT)
  const rows = scopeProducts(db, branch).map((p) => {
    const a = agg.get(p.id) || { qty: 0, revenue: 0, netExGst: 0 }
    const cost = (a.netExGst * pctOf(p.category)) / 100
    const profit = a.netExGst - cost
    return { id: p.id, name: p.name, category: p.category, image: p.images?.[p.primaryImage || 0] || p.images?.[0], qty: a.qty, gross: a.revenue, net: a.netExGst, costPct: pctOf(p.category), cost, profit, margin: a.netExGst ? (profit / a.netExGst) * 100 : 0 }
  }).filter((r) => r.qty > 0).sort((a, b) => b.profit - a.profit)
  const cats = new Map()
  rows.forEach((r) => { const c = cats.get(r.category) || { name: r.category, net: 0, cost: 0, profit: 0 }; c.net += r.net; c.cost += r.cost; c.profit += r.profit; cats.set(r.category, c) })
  const t = rows.reduce((s, r) => ({ net: s.net + r.net, cost: s.cost + r.cost, profit: s.profit + r.profit }), { net: 0, cost: 0, profit: 0 })
  return {
    title: 'Profit Report (Estimated)', rows,
    byCategory: [...cats.values()].sort((a, b) => b.net - a.net),
    totals: { ...t, margin: t.net ? (t.profit / t.net) * 100 : 0 },
    columns: [
      text('name', 'Product', { render: productCell, exp: (r) => r.name }),
      text('category', 'Category'),
      count('qty', 'Units Sold'),
      money('gross', 'Gross Sales'),
      money('net', 'Net Sales (ex-GST)'),
      share('costPct', 'Cost %', { render: (r) => `${r.costPct}%` }),
      money('cost', 'Est. Cost'),
      money('profit', 'Est. Gross Profit', { render: (r) => <b className={r.profit < 0 ? 'text-red-600' : ''}>{inr(r.profit)}</b> }),
      share('margin', 'Est. Margin'),
    ],
  }
}


// Pure derived-data helpers shared across pages. Use inside useMemo(() => fn(db, ...), [db, ...]).
import { inRange } from './dateRange'
import { refundedAmount } from './orderActions'

export const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]))

/** 'In Stock' | 'Low Stock' | 'Out of Stock' */
export const stockStatus = (stock, alert) => (stock <= 0 ? 'Out of Stock' : stock <= alert ? 'Low Stock' : 'In Stock')

/** Product rows with aggregated variant info for tables. */
export function productRows(db) {
  const br = byId(db.branches)
  return db.products.map((p) => {
    const vs = db.variants.filter((v) => v.productId === p.id)
    const active = vs.filter((v) => v.status === 'Active')
    const prices = (active.length ? active : vs).map((v) => v.price)
    const mrps = (active.length ? active : vs).map((v) => v.mrp)
    const stock = vs.reduce((s, v) => s + v.stock, 0)
    const alert = vs.reduce((s, v) => s + (v.alertStock || 0), 0)
    const branchIds = [...new Set(vs.map((v) => v.branchId))]
    return {
      ...p,
      variants: vs,
      image: p.images?.[p.primaryImage || 0] || p.images?.[0] || '',
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      minMrp: mrps.length ? Math.min(...mrps) : 0,
      stock,
      stockStatus: vs.length ? (vs.every((v) => v.stock <= 0) ? 'Out of Stock' : vs.some((v) => v.stock <= v.alertStock) ? 'Low Stock' : 'In Stock') : 'Out of Stock',
      alert,
      branchIds,
      branchNames: branchIds.map((id) => br[id]?.name).filter(Boolean),
    }
  })
}

/** Inventory rows: one per variant (product × branch × size). */
export function inventoryRows(db) {
  const pr = byId(db.products)
  const br = byId(db.branches)
  return db.variants.map((v) => {
    const p = pr[v.productId] || {}
    return { ...v, product: p, productName: p.name, category: p.category, image: p.images?.[p.primaryImage || 0], branchName: br[v.branchId]?.name || '—', stockStatus: stockStatus(v.stock, v.alertStock) }
  })
}
export const lowStock = (db) => inventoryRows(db).filter((r) => r.stock <= r.alertStock && r.status === 'Active').sort((a, b) => a.stock - b.stock)

/** Orders that count towards revenue: not Cancelled/Returned, and the payment neither failed nor was fully refunded. */
export const isRevenue = (o) => !['Cancelled', 'Returned'].includes(o.status) && !['Failed', 'Refunded'].includes(o.paymentStatus)
/** What an order actually brings in: its total less every refund recorded against it (partial refunds too). */
export const netRevenue = (o) => (isRevenue(o) ? Math.max(0, o.total - refundedAmount(o)) : 0)
/** Share of an order's value kept after refunds (0–1). Refunds aren't tied to items, so item figures are scaled by it. */
export const revenueShare = (o) => (o.total > 0 ? netRevenue(o) / o.total : 0)
export const ordersIn = (db, range, branchId = 'all') => db.orders.filter((o) => inRange(o.createdAt, range) && (branchId === 'all' || o.branchId === branchId))

export function kpis(orders) {
  const rev = orders.filter(isRevenue)
  const revenue = rev.reduce((s, o) => s + netRevenue(o), 0)
  return { orders: orders.length, revenue, aov: rev.length ? revenue / rev.length : 0, customers: new Set(orders.map((o) => o.customerId)).size }
}

/** Buckets orders into a time series: unit 'day' | 'week' | 'month'. */
export function salesSeries(orders, range, unit = 'day') {
  const keyOf = (d) => {
    const t = new Date(d)
    if (unit === 'month') return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
    if (unit === 'week') { const m = new Date(t); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m.toISOString().slice(0, 10) }
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }
  const label = (k) => {
    if (unit === 'month') { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }
    const [y, m, d] = k.split('-'); return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }
  const buckets = new Map()
  const cur = new Date(range.from)
  const end = new Date(range.to)
  let guard = 0
  while (cur <= end && guard++ < 800) {
    buckets.set(keyOf(cur), { key: keyOf(cur), revenue: 0, orders: 0 })
    if (unit === 'month') cur.setMonth(cur.getMonth() + 1, 1)
    else cur.setDate(cur.getDate() + (unit === 'week' ? 7 : 1))
  }
  orders.forEach((o) => {
    const b = buckets.get(keyOf(o.createdAt))
    if (!b) return
    b.orders += 1
    b.revenue += netRevenue(o)
  })
  return [...buckets.values()].map((b) => ({ ...b, label: label(b.key) }))
}

/** Primary image URL of a product (order items do not store images — keeps storage small). */
export const productImage = (db, productId) => { const p = db.products.find((x) => x.id === productId); return p?.images?.[p.primaryImage || 0] || p?.images?.[0] || '' }

/** Aggregates order items by product: [{ productId, name, image, qty, revenue }] */
export function topProducts(orders, limit = 5, db) {
  const m = new Map()
  orders.filter(isRevenue).forEach((o) => o.items.forEach((it) => {
    const r = m.get(it.productId) || { productId: it.productId, name: it.name, image: db ? productImage(db, it.productId) : '', qty: 0, revenue: 0 }
    r.qty += it.qty; r.revenue += it.total * revenueShare(o)
    m.set(it.productId, r)
  }))
  return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}
export function branchPerformance(db, orders) {
  return db.branches.map((b) => {
    const os = orders.filter((o) => o.branchId === b.id)
    const k = kpis(os)
    return { id: b.id, name: b.name, code: b.code, ...k }
  }).sort((a, b) => b.revenue - a.revenue)
}
export function categorySales(db, orders) {
  const pr = byId(db.products)
  const m = new Map()
  orders.filter(isRevenue).forEach((o) => o.items.forEach((it) => {
    const c = pr[it.productId]?.category || 'Other'
    m.set(c, (m.get(c) || 0) + it.total * revenueShare(o))
  }))
  return [...m.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue)
}

export function customerStats(db) {
  const m = {}
  db.orders.forEach((o) => {
    const r = (m[o.customerId] ||= { orders: 0, spent: 0, last: null })
    r.orders += 1
    r.spent += netRevenue(o)
    if (!r.last || o.createdAt > r.last) r.last = o.createdAt
  })
  return m
}

/** Module whose permission is needed to see an activity entry (logActivity types). */
export const ACTIVITY_MODULE = { order: 'orders', price: 'prices', stock: 'inventory', product: 'products', customer: 'customers', branch: 'branches', marketing: 'marketing', whatsapp: 'whatsapp', chatbot: 'chatbot', settings: 'settings' }
/** Activity entries the user's role may see. `can(module)` is from useAuth. */
export const visibleActivities = (activities, can) => activities.filter((a) => can(ACTIVITY_MODULE[a.type] || 'settings'))

/**
 * Derived notifications for the header bell, limited to what the user's role may see.
 * `can(module)` is from useAuth; leave it out to get every notification.
 */
export function notifications(db, can = () => true) {
  const read = new Set(db.readNotifications || [])
  const list = []
  if (can('inventory')) lowStock(db).slice(0, 8).forEach((r) => list.push({ id: `ls_${r.id}_${r.stock}`, type: r.stock <= 0 ? 'danger' : 'warning', title: r.stock <= 0 ? 'Out of stock' : 'Low stock', text: `${r.productName} ${r.size} · ${r.branchName} (${r.stock} left)`, to: `/inventory?q=${encodeURIComponent(r.productName)}`, at: null }))
  if (can('orders')) db.orders.filter((o) => o.status === 'Pending').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6).forEach((o) => list.push({ id: `po_${o.id}`, type: 'info', title: 'New order', text: `${o.number} · ${o.customerName}`, to: `/orders/${o.id}`, at: o.createdAt }))
  if (can('chatbot')) db.chatbot.conversations.filter((c) => c.status === 'Handed over').forEach((c) => list.push({ id: `hv_${c.id}_${c.updatedAt}`, type: 'info', title: 'Chat handover', text: `${c.customer} needs a human reply`, to: '/ai-chatbot?tab=conversations', at: c.updatedAt }))
  return list.map((n) => ({ ...n, read: read.has(n.id) }))
}

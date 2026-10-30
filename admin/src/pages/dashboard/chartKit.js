// Chart helpers shared by the Dashboard and Reports pages.
// SERIES is a categorical palette validated (dataviz validate_palette.js, light surface) for
// lightness band, chroma, colour-blind separation and contrast. Assign it in this fixed order,
// keyed by entity (never by rank), and fold anything past 6 into "Other".
import { isRevenue } from '../../services/selectors'

export const SERIES = ['#16A34A', '#2563EB', '#D97706', '#7C3AED', '#0891B2', '#DB2777']
export const OTHER_COLOR = '#94A3A0'
/** Single-series marks use the brand primary; area fill is a soft tint of it. */
export const BRAND = '#064E3B'
export const BRAND_SOFT = '#16A34A'

/** Order statuses mapped to the validated palette (fixed per status, matches badge tones). */
export const STATUS_COLORS = { Delivered: SERIES[0], Processing: SERIES[1], Pending: SERIES[2], Shipped: SERIES[3], Returned: SERIES[4], Cancelled: SERIES[5] }
export const STATUS_ORDER = ['Delivered', 'Processing', 'Pending', 'Shipped', 'Returned', 'Cancelled']

/** Stable colour per entity id/name from a fixed ordered list of all entities. */
export const colorFor = (allKeys, key) => { const i = allKeys.indexOf(key); return i >= 0 && i < SERIES.length ? SERIES[i] : OTHER_COLOR }

// ------------------------------------------------------------------ time buckets
const pad = (n) => String(n).padStart(2, '0')
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const mondayOf = (d) => { const m = startOfDay(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m }

export function bucketKey(d, unit) {
  const t = new Date(d)
  if (unit === 'month') return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`
  if (unit === 'week') { const m = mondayOf(t); return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(m.getDate())}` }
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}
export function bucketLabel(key, unit) {
  if (unit === 'month') { const [y, m] = key.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }
  const [y, m, d] = key.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
/** Picks a sensible bucket size for a range. */
export const unitFor = ({ from, to }) => { const days = (to - from) / 86400000; return days <= 35 ? 'day' : days <= 130 ? 'week' : 'month' }

/**
 * Buckets orders over `range` into rows:
 * { key, label, orders, revenue, revenueOrders, items, discount, tax, cancelled, aov }
 * Revenue excludes Cancelled/Returned orders (same rule as selectors.isRevenue).
 */
export function timeSeries(orders, range, unit = 'day') {
  const map = new Map()
  const cur = unit === 'month' ? new Date(range.from.getFullYear(), range.from.getMonth(), 1) : unit === 'week' ? mondayOf(range.from) : startOfDay(range.from)
  let guard = 0
  while (cur <= range.to && guard++ < 1000) {
    const key = bucketKey(cur, unit)
    map.set(key, { key, label: bucketLabel(key, unit), orders: 0, revenue: 0, revenueOrders: 0, items: 0, discount: 0, tax: 0, cancelled: 0 })
    if (unit === 'month') cur.setMonth(cur.getMonth() + 1, 1)
    else cur.setDate(cur.getDate() + (unit === 'week' ? 7 : 1))
  }
  orders.forEach((o) => {
    const b = map.get(bucketKey(o.createdAt, unit))
    if (!b) return
    b.orders += 1
    if (isRevenue(o)) {
      b.revenue += o.total; b.revenueOrders += 1; b.discount += o.discount || 0; b.tax += o.tax || 0
      b.items += o.items.reduce((s, it) => s + it.qty, 0)
    } else b.cancelled += 1
  })
  return [...map.values()].map((b) => ({ ...b, aov: b.revenueOrders ? b.revenue / b.revenueOrders : 0 }))
}

/** Last `n` months (unit 'month') or weeks (unit 'week') ending now. */
export function trailingRange(unit, n = 12, now = new Date()) {
  const from = unit === 'month' ? new Date(now.getFullYear(), now.getMonth() - (n - 1), 1) : (() => { const m = mondayOf(now); m.setDate(m.getDate() - 7 * (n - 1)); return m })()
  return { from, to: now }
}

/** Folds rows beyond SERIES.length-1 into "Other" and assigns colours in order of `allKeys`. */
export function toPieData(rows, { key = 'name', value = 'revenue', allKeys } = {}) {
  const keys = allKeys || rows.map((r) => r[key])
  const top = rows.slice(0, SERIES.length)
  const rest = rows.slice(SERIES.length)
  const out = top.map((r) => ({ name: r[key], value: r[value], color: colorFor(keys, r[key]) }))
  if (rest.length) out.push({ name: 'Other', value: rest.reduce((s, r) => s + r[value], 0), color: OTHER_COLOR })
  return out
}

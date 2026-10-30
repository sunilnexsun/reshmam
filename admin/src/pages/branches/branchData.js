// Derived numbers for the Branches module (pure helpers — use inside useMemo).
import { isRevenue, kpis } from '../../services/selectors'
import { inRange, resolveRange } from '../../utils/dateRange'

/** Per-branch aggregates keyed by branch id. */
export function branchStats(db) {
  const month = resolveRange('month')
  const lastMonth = resolveRange('lastMonth')
  const out = {}
  db.branches.forEach((b) => {
    const vs = db.variants.filter((v) => v.branchId === b.id)
    const orders = db.orders.filter((o) => o.branchId === b.id)
    const thisMonth = orders.filter((o) => inRange(o.createdAt, month))
    const prevMonth = orders.filter((o) => inRange(o.createdAt, lastMonth))
    out[b.id] = {
      variants: vs.length,
      products: new Set(vs.map((v) => v.productId)).size,
      stock: vs.reduce((s, v) => s + v.stock, 0),
      stockValue: vs.reduce((s, v) => s + v.stock * v.price, 0),
      lowStock: vs.filter((v) => v.status === 'Active' && v.stock > 0 && v.stock <= v.alertStock).length,
      outOfStock: vs.filter((v) => v.status === 'Active' && v.stock <= 0).length,
      orders: orders.length,
      monthOrders: thisMonth.length,
      monthRevenue: kpis(thisMonth).revenue,
      lastMonthRevenue: kpis(prevMonth).revenue,
      totalRevenue: orders.filter(isRevenue).reduce((s, o) => s + o.total, 0),
    }
  })
  return out
}

export const location = (b) => [b.city, b.state].filter(Boolean).join(', ')
export const fullAddress = (b) => [b.address, b.city, `${b.state || ''} ${b.pincode || ''}`.trim()].filter(Boolean).join(', ')

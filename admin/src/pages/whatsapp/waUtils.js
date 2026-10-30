// Template helpers for the WhatsApp module (frontend only — nothing here talks to Meta).
export const VARIABLES = [
  { key: 'customer_name', label: 'Customer name' },
  { key: 'order_id', label: 'Order ID' },
  { key: 'order_total', label: 'Order total' },
  { key: 'product_name', label: 'Product name' },
  { key: 'tracking_link', label: 'Tracking link' },
  { key: 'payment_link', label: 'Payment link' },
  { key: 'coupon_code', label: 'Coupon code' },
  { key: 'discount', label: 'Discount' },
  { key: 'branch_name', label: 'Branch name' },
  { key: 'stock', label: 'Stock' },
]
export const TEMPLATE_TYPES = ['Utility', 'Marketing', 'Authentication']
export const TEMPLATE_LANGUAGES = ['English', 'Tamil', 'Hindi', 'Malayalam', 'Telugu', 'Kannada']
export const TEMPLATE_STATUSES = ['Approved', 'Pending', 'Draft', 'Rejected']
export const LOG_STATUSES = ['Sent', 'Delivered', 'Read', 'Failed', 'Simulated']
export const DELAYS = [
  { value: 0, label: 'Immediately' }, { value: 15, label: 'After 15 minutes' }, { value: 60, label: 'After 1 hour' },
  { value: 180, label: 'After 3 hours' }, { value: 1440, label: 'After 1 day' }, { value: 4320, label: 'After 3 days' }, { value: 10080, label: 'After 7 days' },
]
export const delayLabel = (m) => DELAYS.find((d) => d.value === Number(m))?.label || (m >= 1440 ? `After ${Math.round(m / 1440)} days` : m >= 60 ? `After ${Math.round(m / 60)} hours` : `After ${m} minutes`)

/** Mock values for previews / test messages, filled from real sample records when available. */
export function sampleValues(db) {
  const o = [...(db?.orders || [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
  const v = db?.variants?.find((x) => x.stock > 0 && x.stock <= x.alertStock) || db?.variants?.[0]
  const p = v && db.products.find((x) => x.id === v.productId)
  const b = v && db.branches.find((x) => x.id === v.branchId)
  const coupon = db?.coupons?.find((c) => c.status === 'Active')
  return {
    customer_name: o?.customerName?.split(' ')[0] || 'Priya',
    order_id: o?.number || 'RSH-10234',
    order_total: o ? `₹${o.total.toLocaleString('en-IN')}` : '₹1,250',
    product_name: p ? `${p.name} ${v.size}` : 'Pure Coconut Oil 1 L',
    tracking_link: 'https://reshmam.com/track/ST123456789',
    payment_link: 'https://rzp.io/l/sample',
    coupon_code: coupon?.code || 'FESTIVE5',
    discount: coupon ? (coupon.type === 'Flat' ? `₹${coupon.value}` : `${coupon.value}%`) : '10%',
    branch_name: b?.name || 'Velum Mayilum – Main Branch',
    stock: String(v?.stock ?? 6),
  }
}

export const render = (text = '', values = {}) => text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => values[k] ?? m)
export const variablesIn = (text = '') => [...new Set([...text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]))]
export const unknownVariables = (text) => variablesIn(text).filter((k) => !VARIABLES.some((v) => v.key === k))

// Shared helpers for the Orders module (list, details, invoice).
import { refundedAmount } from '../../services/orderActions'

/** Sensible forward transitions. Cancelled / Returned are final. */
export const NEXT_STATUS = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Returned'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
}
export const allowedNext = (o) => NEXT_STATUS[o.status] || []
export const isFinal = (o) => allowedNext(o).length === 0

// Stock is deducted when an order is confirmed and restocked on cancel/return — rules live in the store.
export { willRestock, willDeduct } from '../../services/store'

export const isCod = (o) => o.paymentMethod === 'Cash on Delivery'
export const refundable = (o) => Math.max(0, Math.round((o.total - refundedAmount(o)) * 100) / 100)
/** Money has actually been collected and not fully refunded. */
export const canRefund = (o) => ['Paid', 'Partially Refunded'].includes(o.paymentStatus) && refundable(o) > 0

export const couriersFrom = (settings) => (settings?.shipping?.couriers || '').split(',').map((s) => s.trim()).filter(Boolean)

export const invoiceNumber = (o, settings) => `${settings?.tax?.invoicePrefix || 'INV-'}${o.number.replace(/^[A-Za-z]+-?/, '')}`

/** GST-inclusive breakdown grouped by rate. Intra-state → CGST+SGST, otherwise IGST. */
export function gstBreakdown(o, settings) {
  const home = settings?.tax?.placeOfSupply || settings?.company?.state || 'Tamil Nadu'
  const intra = (o.shippingAddress?.state || home) === home
  const groups = {}
  o.items.forEach((it) => {
    const r = Number(it.gst) || 0
    const g = (groups[r] ||= { rate: r, gross: 0 })
    g.gross += it.total
  })
  const rows = Object.values(groups).map((g) => {
    const tax = Math.round(((g.gross * g.rate) / (100 + g.rate)) * 100) / 100
    return { rate: g.rate, gross: g.gross, taxable: Math.round((g.gross - tax) * 100) / 100, tax, cgst: intra ? tax / 2 : 0, sgst: intra ? tax / 2 : 0, igst: intra ? 0 : tax }
  }).sort((a, b) => a.rate - b.rate)
  return { intra, rows, totalTax: rows.reduce((s, r) => s + r.tax, 0) }
}

export const addressLines = (a = {}) => [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` – ${a.pincode}` : '')].filter((x) => x && x.trim())

export const companyLines = (c = {}) => [c.address, [c.city, c.state].filter(Boolean).join(', ') + (c.pincode ? ` – ${c.pincode}` : ''), [c.phone, c.mobile && `+91 ${c.mobile}`].filter(Boolean).join(' / '), c.email].filter((x) => x && x.trim())

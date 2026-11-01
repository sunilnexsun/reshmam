// Shared helpers for the Orders module (list, details, invoice).
import { gstByRate, orderGst } from '@admin/_lib/gst'
import { refundedAmount } from '@admin/_lib/orderActions'
import { awaitingPayment } from '@admin/_lib/store'

/** Sensible forward transitions. Cancelled / Returned are final. */
export const NEXT_STATUS = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Returned'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
}
/** Statuses an order can move to next. An unpaid online order can only be cancelled. */
export const allowedNext = (o) => (NEXT_STATUS[o.status] || []).filter((s) => !(awaitingPayment(o) && FULFIL.includes(s)))
export const isFinal = (o) => (NEXT_STATUS[o.status] || []).length === 0
const FULFIL = ['Processing', 'Shipped', 'Delivered']

// Stock is deducted when an order is confirmed and restocked on cancel/return — rules live in the store.
export { awaitingPayment, willRestock, willDeduct } from '@admin/_lib/store'

export const isCod = (o) => o.paymentMethod === 'Cash on Delivery'
export const refundable = (o) => Math.max(0, Math.round((o.total - refundedAmount(o)) * 100) / 100)
/** Money has actually been collected and not fully refunded. */
export const canRefund = (o) => ['Paid', 'Partially Refunded'].includes(o.paymentStatus) && refundable(o) > 0

export const couriersFrom = (settings) => (settings?.shipping?.couriers || '').split(',').map((s) => s.trim()).filter(Boolean)


/**
 * GST-inclusive breakdown grouped by rate, after the order's discount (spread over items by value).
 * Intra-state → CGST+SGST, otherwise IGST.
 */
export function gstBreakdown(o, settings) {
  const home = settings?.tax?.placeOfSupply || settings?.company?.state || 'Tamil Nadu'
  const intra = (o.shippingAddress?.state || home) === home
  // Settings → Tax: with "Charge GST" off the business isn't charging GST, so there is nothing to break down.
  if (settings?.tax?.gstEnabled === false) return { intra, rows: [], totalTax: 0, gstEnabled: false }
  // Split in whole paise: CGST gets half rounded, SGST the exact remainder, so the two always add up to the tax.
  const rows = gstByRate(o).map((r) => {
    const cgst = intra ? Math.round((r.tax / 2) * 100) / 100 : 0
    return { ...r, cgst, sgst: intra ? Math.round((r.tax - cgst) * 100) / 100 : 0, igst: intra ? 0 : r.tax }
  })
  return { intra, rows, totalTax: orderGst(o), gstEnabled: true }
}

export const addressLines = (a = {}) => [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` – ${a.pincode}` : '')].filter((x) => x && x.trim())

export const companyLines = (c = {}) => [c.address, [c.city, c.state].filter(Boolean).join(', ') + (c.pincode ? ` – ${c.pincode}` : ''), [c.phone, c.mobile && `+91 ${c.mobile}`].filter(Boolean).join(' / '), c.email].filter((x) => x && x.trim())

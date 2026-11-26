// Invoices are issued once, when an order is first confirmed, and keep the number, date, seller details
// and tax settings of that moment. Reprinting later — after the invoice prefix, GSTIN, address or home state
// changes — reproduces the same document instead of renumbering or re-splitting it.

/** Invoice number for an order number with the configured prefix: RSH-10001 → INV-10001. */
export const invoiceNumberFor = (orderNumber, settings) => `${settings?.tax?.invoicePrefix || 'INV-'}${String(orderNumber || '').replace(/^[A-Za-z]+-?/, '')}`

/** The invoice details to store on an order confirmed at `at` (ISO string). */
export function issueInvoice(order, settings, at) {
  const company = { ...settings?.company }
  delete company.logo // a large data URL that the invoice doesn't print
  const tax = settings?.tax || {}
  return {
    number: invoiceNumberFor(order.number || order.order_number || order.id, settings),
    date: at || order.createdAt || new Date().toISOString(),
    company,
    tax: {
      gstEnabled: tax.gstEnabled !== false,
      gstin: company.gstin || tax.gstin || '',
      hsnOnInvoice: tax.hsnOnInvoice !== false,
      placeOfSupply: tax.placeOfSupply || company.state || 'Tamil Nadu',
    },
  }
}

const CONFIRMED = ['Processing', 'Shipped', 'Delivered']

/**
 * Returns the stored invoice when present, or synthesises one from current settings so confirmed orders
 * (including storefront orders placed before invoice issuance) and pending/proforma orders can always
 * be printed or downloaded as PDF.
 */
export function resolveOrderInvoice(order, settings) {
  if (!order) return null
  if (order.invoice) return { invoice: order.invoice, isProforma: false }
  const confirmedAt =
    order.timeline?.find((t) => CONFIRMED.includes(t.status))?.at ||
    (CONFIRMED.includes(order.status) || order.status === 'Returned' || order.stockDeducted || order.paymentStatus === 'Paid'
      ? order.updatedAt || order.createdAt
      : null)
  if (confirmedAt) {
    return { invoice: issueInvoice(order, settings, confirmedAt), isProforma: false }
  }
  return { invoice: issueInvoice(order, settings, order.createdAt), isProforma: true }
}

/**
 * Adds an invoice to every confirmed order that doesn't have one, dated when it was first confirmed (or when
 * it was placed). Used for sample data and for saved data from before invoices were stored.
 */
export function withIssuedInvoices(db) {
  return {
    ...db,
    orders: db.orders.map((o) => {
      if (o.invoice) return o
      // Confirmed at some point — including orders since returned (their stock was put back).
      const confirmedAt = o.timeline?.find((t) => CONFIRMED.includes(t.status))?.at || (o.stockDeducted ? o.createdAt : null)
      return confirmedAt ? { ...o, invoice: issueInvoice(o, db.settings, confirmedAt) } : o
    }),
  }
}

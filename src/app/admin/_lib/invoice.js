// Invoices are issued once, when an order is first confirmed, and keep the number, date, seller details
// and tax settings of that moment. Reprinting later — after the invoice prefix, GSTIN, address or home state
// changes — reproduces the same document instead of renumbering or re-splitting it.

/** Invoice number for an order number with the configured prefix: RSH-10001 → INV-10001. */
export const invoiceNumberFor = (orderNumber, settings) => `${settings?.tax?.invoicePrefix || 'INV-'}${orderNumber.replace(/^[A-Za-z]+-?/, '')}`

/** The invoice details to store on an order confirmed at `at` (ISO string). */
export function issueInvoice(order, settings, at) {
  const company = { ...settings?.company }
  delete company.logo // a large data URL that the invoice doesn't print
  const tax = settings?.tax || {}
  return {
    number: invoiceNumberFor(order.number, settings),
    date: at,
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

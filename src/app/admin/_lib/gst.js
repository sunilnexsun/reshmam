// GST on orders. Prices include GST. A coupon discount lowers the taxable value, so it is spread over the
// items in proportion to their value before the tax is worked out. Shipping is not part of the items' tax.

const round2 = (n) => Math.round(n * 100) / 100

/** Fraction of each item's value left after the order's discount (1 when there is none). */
export const discountFactor = (o) => (o.subtotal > 0 ? Math.max(0, 1 - (o.discount || 0) / o.subtotal) : 1)

/**
 * Per-rate GST of an order after its discount: [{ rate, gross, taxable, tax }], sorted by rate.
 * Amounts are whole paise. Rounding each group can leave the groups a paisa off the discounted item value,
 * so that difference is put on the largest group: the gross values always add up to items − discount.
 */
export function gstByRate(o) {
  const f = discountFactor(o)
  const groups = {}
  let exact = 0
  ;(o.items || []).forEach((it) => {
    const rate = Number(it.gst) || 0
    const lineTotal = Number(it.total ?? it.subtotal ?? (Number(it.price || 0) * Number(it.qty || 1))) || 0
    groups[rate] = (groups[rate] || 0) + lineTotal * f
    exact += lineTotal * f
  })
  const rows = Object.entries(groups).map(([rate, gross]) => ({ rate: Number(rate), gross: round2(gross) }))
  if (rows.length) {
    const largest = rows.reduce((a, b) => (b.gross > a.gross ? b : a))
    largest.gross = round2(largest.gross + round2(exact) - round2(rows.reduce((s, r) => s + r.gross, 0)))
  }
  return rows.map(({ rate, gross }) => {
    const tax = round2((gross * rate) / (100 + rate))
    return { rate, gross, taxable: round2(gross - tax), tax }
  }).sort((a, b) => a.rate - b.rate)
}

/** Total GST in an order after its discount — `{ items, subtotal, discount }`. Matches the invoice to the paisa. */
export const orderGst = (o) => round2(gstByRate(o).reduce((s, r) => s + r.tax, 0))

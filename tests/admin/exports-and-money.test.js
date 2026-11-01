import { describe, expect, it } from 'vitest'
import { csvSafe } from '@admin/_lib/export'
import { orderGst } from '@admin/_lib/gst'
import { isRevenue, kpis, netRevenue } from '@admin/_lib/selectors'
import { gstBreakdown } from '@admin/orders/orderUtils'

describe('csvSafe', () => {
  it.each(['=HYPERLINK("http://x","y")', '+1+1', '-2+3', '@SUM(A1)', '\t=1', '\r=1'])('neutralises formula-like text %j', (v) => {
    expect(csvSafe(v)).toBe(`'${v}`)
  })
  it('leaves numbers, negative numbers and percentages alone', () => {
    expect(csvSafe('-250')).toBe('-250')
    expect(csvSafe('-3.5%')).toBe('-3.5%')
    expect(csvSafe(-250)).toBe(-250)
  })
  it('leaves ordinary text alone', () => {
    expect(csvSafe('Arun Kumar')).toBe('Arun Kumar')
  })
})

describe('revenue', () => {
  const paid = { status: 'Delivered', paymentStatus: 'Paid', total: 1000 }
  it('counts a paid order in full', () => {
    expect(netRevenue(paid)).toBe(1000)
  })
  it('subtracts every partial refund', () => {
    expect(netRevenue({ ...paid, paymentStatus: 'Partially Refunded', refunds: [{ amount: 300 }, { amount: 100 }] })).toBe(600)
  })
  it('reads the older single-refund shape too', () => {
    expect(netRevenue({ ...paid, paymentStatus: 'Partially Refunded', refund: { amount: 250 } })).toBe(750)
  })
  it('excludes fully refunded, failed, cancelled and returned orders', () => {
    expect(isRevenue({ ...paid, paymentStatus: 'Refunded' })).toBe(false)
    expect(isRevenue({ ...paid, status: 'Pending', paymentStatus: 'Failed' })).toBe(false)
    expect(isRevenue({ ...paid, status: 'Cancelled' })).toBe(false)
    expect(isRevenue({ ...paid, status: 'Returned' })).toBe(false)
  })
  it('kpis add up net revenue', () => {
    const k = kpis([paid, { ...paid, paymentStatus: 'Partially Refunded', refunds: [{ amount: 250 }] }])
    expect(k.revenue).toBe(1750)
    expect(k.aov).toBe(875)
  })
})

describe('GST after discount', () => {
  const order = { subtotal: 1000, discount: 100, items: [{ total: 600, gst: 5 }, { total: 400, gst: 12 }], shippingAddress: { state: 'Tamil Nadu' } }
  const g = gstBreakdown(order, {})
  const sum = (rows, k) => Math.round(rows.reduce((s, r) => s + r[k], 0) * 100) / 100

  it('works out tax on the discounted values', () => {
    expect(g.totalTax).toBeCloseTo((540 * 5) / 105 + (360 * 12) / 112, 1)
  })
  it('taxable rows add up to subtotal less discount', () => {
    expect(sum(g.rows, 'gross')).toBe(900)
    g.rows.forEach((r) => expect(r.taxable + r.tax).toBeCloseTo(r.gross, 2))
  })
  it('invoice total equals the stored order total', () => {
    expect(g.totalTax).toBe(orderGst(order))
    expect(sum(g.rows, 'tax')).toBe(g.totalTax)
  })
  it('puts the rounding paisa on a group, so groups still add up', () => {
    const tricky = { subtotal: 3, discount: 1, items: [{ total: 1, gst: 5 }, { total: 1, gst: 12 }, { total: 1, gst: 18 }] }
    expect(sum(gstBreakdown(tricky, {}).rows, 'gross')).toBe(2)
  })
  it('splits an odd number of paise into CGST and SGST that add up', () => {
    const [row] = gstBreakdown({ subtotal: 1.05, discount: 0, items: [{ total: 1.05, gst: 5 }] }, {}).rows
    expect(row.tax).toBe(0.05)
    expect([row.cgst, row.sgst]).toEqual([0.03, 0.02])
  })
  it('uses IGST for other states', () => {
    const r = gstBreakdown({ ...order, shippingAddress: { state: 'Kerala' } }, {})
    expect(r.intra).toBe(false)
    r.rows.forEach((row) => expect([row.cgst, row.sgst, row.igst]).toEqual([0, 0, row.tax]))
  })
  it('matches the old figure when there is no discount', () => {
    expect(orderGst({ subtotal: 1000, discount: 0, items: order.items })).toBeCloseTo((600 * 5) / 105 + (400 * 12) / 112, 2)
  })
})

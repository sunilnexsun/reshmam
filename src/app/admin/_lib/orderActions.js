// Orders module — extra domain actions (kept separate from store.js so modules don't collide).
// Backend phase: replace the body of recordOrderRefund with a call to the backend, which must call
// the Razorpay Refunds API and only mark the refund "Processed" after the gateway confirms it.
import { getActor, getState, logActivity, setState } from './store'
import { uid } from './format'

const now = () => new Date().toISOString()

/**
 * Records a (possibly partial, possibly repeated) refund against an order.
 * - Online (Razorpay) payments → status "Pending gateway": NO money moves from the browser.
 * - Cash on Delivery → status "Manual": the store refunds the customer by cash / bank transfer itself.
 * Keeps `order.refund` as the cumulative summary (read by other modules) and `order.refunds` as history.
 */
export function recordOrderRefund(orderId, { amount, reason, reference = '' }) {
  const o = getState().orders.find((x) => x.id === orderId)
  if (!o) throw new Error('Order not found.')
  amount = Math.round(Number(amount) * 100) / 100
  const already = refundedAmount(o)
  const remaining = Math.round((o.total - already) * 100) / 100
  if (!(amount > 0)) throw new Error('Refund amount must be greater than zero.')
  if (amount > remaining) throw new Error(`Only ₹${remaining} can still be refunded on this order.`)
  if (!reason?.trim()) throw new Error('Enter a reason for the refund.')
  const cod = o.paymentMethod === 'Cash on Delivery'
  const status = cod ? 'Manual' : 'Pending gateway'
  const entry = { id: uid('rf'), amount, reason: reason.trim(), reference: reference.trim(), method: cod ? 'Manual (cash / bank transfer)' : 'Razorpay', status, by: getActor(), at: now() }
  const total = Math.round((already + amount) * 100) / 100
  const full = total >= o.total
  setState((s) => ({
    ...s,
    orders: s.orders.map((x) => (x.id === orderId ? {
      ...x,
      paymentStatus: full ? 'Refunded' : 'Partially Refunded',
      refunds: [...(x.refunds || legacyRefunds(x)), entry],
      refund: { amount: total, reason: entry.reason, status, refId: x.refund?.refId || '', at: entry.at },
      timeline: [...x.timeline, { status: x.status, event: 'refund', note: `Refund of ₹${amount} recorded (${cod ? 'manual – COD' : 'pending Razorpay'}) — ${entry.reason}`, at: entry.at, by: getActor() }],
      updatedAt: entry.at,
    } : x)),
  }))
  logActivity('order', `Refund ₹${amount} recorded for ${o.number}${cod ? ' (manual, COD)' : ' (pending gateway)'}`)
  return entry
}

/** Seed orders only have a single `refund` object — expose it as a one-entry history. */
export function legacyRefunds(o) {
  if (o.refunds) return o.refunds
  if (!o.refund) return []
  return [{ id: `${o.id}_rf0`, amount: o.refund.amount, reason: o.refund.reason, reference: o.refund.refId || '', method: o.paymentMethod === 'Cash on Delivery' ? 'Manual (cash / bank transfer)' : 'Razorpay', status: o.refund.status, by: 'Admin', at: o.refund.at }]
}
export const refundedAmount = (o) => legacyRefunds(o).reduce((s, r) => s + Number(r.amount || 0), 0)

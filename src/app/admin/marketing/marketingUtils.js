// Helpers for the Marketing page: audience segments, coupon state and date conversions.

export const CHANNELS = ['WhatsApp', 'Email', 'SMS']
export const SEGMENTS = [
  { value: 'all', label: 'All customers' },
  { value: 'optin', label: 'Opted-in WhatsApp customers' },
  { value: 'wholesale', label: 'Wholesale customers' },
  { value: 'repeat', label: 'Repeat customers (2+ orders)' },
  { value: 'inactive', label: 'Inactive (no order in 90 days)' },
]
const LEGACY = { 'All opted-in customers': 'optin', 'Wholesale customers': 'wholesale', 'Repeat customers': 'repeat', 'All customers': 'all' }
export const segmentOf = (c) => c.segment || LEGACY[c.audience] || 'all'
export const segmentLabel = (v) => SEGMENTS.find((s) => s.value === v)?.label || v

/** Active customers in a segment. Uses order history for repeat / inactive. */
export function segmentMembers(db, segment, now = Date.now()) {
  const stats = {}
  db.orders.forEach((o) => {
    const r = (stats[o.customerId] ||= { orders: 0, last: '' })
    r.orders += 1
    if (o.createdAt > r.last) r.last = o.createdAt
  })
  const cutoff = new Date(now - 90 * 86400000).toISOString()
  const active = db.customers.filter((c) => c.status === 'Active')
  switch (segment) {
    case 'optin': return active.filter((c) => c.whatsappOptIn)
    case 'wholesale': return active.filter((c) => c.tags?.includes('Wholesale'))
    case 'repeat': return active.filter((c) => (stats[c.id]?.orders || 0) > 1)
    case 'inactive': return active.filter((c) => !stats[c.id] || stats[c.id].last < cutoff)
    default: return active
  }
}
/** Members that can actually be reached on a channel (WhatsApp needs opt-in; Email needs an address). */
export function reachable(members, channel) {
  if (channel === 'WhatsApp') return members.filter((c) => c.whatsappOptIn && c.phone)
  if (channel === 'Email') return members.filter((c) => c.email)
  return members.filter((c) => c.phone)
}
export const reachNote = { WhatsApp: 'opted in to WhatsApp', Email: 'with an email address', SMS: 'with a mobile number' }

// ---------------------------------------------------------------- coupons
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Effective coupon state from its switch, validity window and usage. */
export function couponState(c, today = todayISO()) {
  if (c.status === 'Inactive') return 'Inactive'
  if (c.validTo && c.validTo < today) return 'Expired'
  if (c.validFrom && c.validFrom > today) return 'Scheduled'
  if (c.usageLimit && (c.used || 0) >= c.usageLimit) return 'Used up'
  return 'Active'
}
export const COUPON_TONE = { Active: 'green', Inactive: 'gray', Expired: 'gray', Scheduled: 'blue', 'Used up': 'amber' }

// ---------------------------------------------------------------- dates
/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export const BANNER_POSITIONS = ['Home – Hero', 'Home – Middle', 'Products – Top', 'Product Page – Sidebar', 'Cart – Top']

// Formatting helpers shared by every page.
const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numFmt = new Intl.NumberFormat('en-IN')

/** ₹2,18,450 (no decimals unless `exact`) */
export const inr = (n, exact = false) => (exact ? inrFmt2 : inrFmt).format(Number(n) || 0)
/** Compact ₹ for chart axes: ₹1.2L, ₹45K */
export const inrShort = (n) => {
  n = Number(n) || 0
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`
  return `₹${n}`
}
export const num = (n) => numFmt.format(Number(n) || 0)
export const pct = (n, d = 1) => `${n >= 0 ? '+' : ''}${(Number(n) || 0).toFixed(d)}%`

const dFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const dtFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const date = (d) => (d ? dFmt.format(new Date(d)) : '—')
export const dateTime = (d) => (d ? dtFmt.format(new Date(d)) : '—')
export const isoDay = (d) => new Date(d).toISOString().slice(0, 10)
export const timeAgo = (d) => {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  if (s < 86400 * 30) { const d = Math.floor(s / 86400); return `${d} day${d === 1 ? '' : 's'} ago` }
  return date(d)
}

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
export const cn = (...c) => c.filter(Boolean).join(' ')
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
export const slug = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const sum = (arr, fn = (x) => x) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0)
export const groupBy = (arr, fn) => arr.reduce((m, x) => ((m[fn(x)] ||= []).push(x), m), {})

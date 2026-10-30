// Date-range presets used by Dashboard and Reports filters.
export const RANGE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

/** Returns { from: Date, to: Date } for a preset (custom uses the given from/to yyyy-mm-dd strings). */
export function resolveRange(preset, custom = {}, now = new Date()) {
  const today = startOfDay(now)
  switch (preset) {
    case 'today': return { from: today, to: endOfDay(now) }
    case 'week': { const f = new Date(today); f.setDate(f.getDate() - ((f.getDay() + 6) % 7)); return { from: f, to: endOfDay(now) } }
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
    case 'lastMonth': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)) }
    case '90d': { const f = new Date(today); f.setDate(f.getDate() - 89); return { from: f, to: endOfDay(now) } }
    case 'year': return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
    case 'custom': return { from: custom.from ? startOfDay(custom.from) : new Date(2000, 0, 1), to: custom.to ? endOfDay(custom.to) : endOfDay(now) }
    default: return { from: new Date(2000, 0, 1), to: endOfDay(now) }
  }
}
/** The equal-length period immediately before `range` (for % growth). */
export function previousRange({ from, to }) {
  const len = to - from
  return { from: new Date(from - len - 1), to: new Date(from - 1) }
}
export const inRange = (d, { from, to }) => { const t = new Date(d); return t >= from && t <= to }
export const growth = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0)

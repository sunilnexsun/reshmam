// Shared chart styling for Recharts. Palette is built around the brand greens with
// distinguishable secondary hues for multi-series charts.
import { inr, inrShort, num } from '@admin/_lib/format'

// Colour-blind-checked order (validated with the dataviz skill's checker).
export const CHART_COLORS = ['#16A34A', '#2563EB', '#D97706', '#7C3AED', '#0891B2', '#DB2777']
export const AXIS = { tick: { fontSize: 11, fill: '#64716C' }, axisLine: false, tickLine: false }
export const GRID = { strokeDasharray: '3 3', stroke: '#E3E8E6', vertical: false }
export const moneyAxis = (v) => inrShort(v)

/** <Tooltip content={<ChartTooltip money />} /> */
export function ChartTooltip({ active, payload, label, money, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {p.name}: <b className="text-ink">{formatter ? formatter(p.value, p) : money ? inr(p.value) : num(p.value)}</b>
        </p>
      ))}
    </div>
  )
}

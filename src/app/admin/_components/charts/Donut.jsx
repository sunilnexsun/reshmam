import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { inr, num } from '@admin/_lib/format'

// ------------------------------------------------------------------ Donut with legend
/**
 * data: [{ name, value, color }]. Part-to-whole only (<= 6 segments + Other).
 * Legend lists label, value and share so identity never relies on colour alone.
 */
export default function Donut({ data, money = false, centerLabel, centerValue, height = 220, emptyText = 'No data for this period' }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const fmt = (v) => (money ? inr(v) : num(v))
  if (!total) return <p className="flex items-center justify-center text-sm text-muted" style={{ height }}>{emptyText}</p>
  const shown = data.filter((d) => d.value > 0)
  return (
    <div className="@container w-full">
    <div className="flex flex-col items-center gap-5 @md:flex-row @md:items-center">
      <div className="relative w-full max-w-[220px] shrink-0" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={shown} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="94%" stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {shown.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
                <p className="flex items-center gap-2 font-semibold text-ink"><span className="h-2 w-2 rounded-full" style={{ background: payload[0].payload.color }} />{payload[0].name}</p>
                <p className="mt-0.5 text-muted">{fmt(payload[0].value)} · {((payload[0].value / total) * 100).toFixed(1)}%</p>
              </div>
            ) : null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-ink">{centerValue ?? fmt(total)}</span>
          <span className="text-[11px] text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink">{d.name}</span>
            <span className="font-medium text-ink tabular-nums">{fmt(d.value)}</span>
            <span className="w-12 text-right text-xs text-muted tabular-nums">{total ? ((d.value / total) * 100).toFixed(1) : '0.0'}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  )
}


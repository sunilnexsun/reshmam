// Chart sections for each Reports tab. Tables are rendered by Reports.jsx (shared export logic).
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RotateCcw } from 'lucide-react'
import { AXIS, ChartTooltip, moneyAxis } from '@admin/_components/charts'
import { Button, Card, DemoNote } from '@admin/_components/ui'
import { inr, num } from '@admin/_lib/format'
import { SERIES } from '@admin/_components/charts/chartKit'
import Donut from '@admin/_components/charts/Donut'
import { RevenueBars, TrendArea } from '@admin/_components/charts/DashboardWidgets'
import { DEFAULT_COST_PCT } from './reportData'

const GRID = { stroke: '#EDF1EF', vertical: false }
const short = (s, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Horizontal ranked bars. data: [{ name, value, color? }] */
function HBar({ data, money = true, height, name = 'Revenue' }) {
  if (!data.length) return <p className="py-16 text-center text-sm text-muted">No data for this period</p>
  const h = height || Math.max(160, data.length * 38 + 30)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke="#EDF1EF" horizontal={false} />
        <XAxis type="number" {...AXIS} tickFormatter={money ? moneyAxis : num} allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...AXIS} width={128} tickFormatter={(v) => short(v)} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: 'rgba(6,78,59,0.05)' }} />
        <Bar dataKey="value" name={name} radius={[0, 4, 4, 0]} maxBarSize={22} fill={SERIES[0]} isAnimationActive={false}>
          {data.map((d) => <Cell key={d.name} fill={d.color || SERIES[0]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

const Tile = ({ label, value, hint }) => (
  <div className="rounded-lg border border-line bg-surface/50 p-3">
    <p className="text-xs text-muted">{label}</p>
    <p className="mt-0.5 text-lg font-bold text-ink">{value}</p>
    {hint && <p className="text-[11px] text-muted">{hint}</p>}
  </div>
)
const Grid2 = ({ children }) => <div className="grid gap-6 print:grid-cols-1 lg:grid-cols-2 [&>*]:break-inside-avoid">{children}</div>

export function SalesView({ report, branchName }) {
  const unitName = { day: 'Daily', week: 'Weekly', month: 'Monthly' }[report.unit]
  return (
    <Grid2>
      <Card title="Revenue Trend" subtitle={`${unitName} revenue · selected period · ${branchName}`}><TrendArea data={report.trend} metric="revenue" height={260} /></Card>
      <Card title="Monthly Sales" subtitle={`Last 12 months · ${branchName} · lighter bar = current month so far`}><RevenueBars data={report.monthly} height={260} /></Card>
    </Grid2>
  )
}

export function ProductView({ report }) {
  return (
    <Grid2>
      <Card title="Top Selling Products" subtitle="By revenue in the selected period"><HBar data={report.top.map((r) => ({ name: r.name, value: r.revenue }))} /></Card>
      <Card title="Category-wise Sales" subtitle="Share of product revenue"><Donut data={report.categories} money centerLabel="revenue" /></Card>
    </Grid2>
  )
}

export function InventoryView({ report }) {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="SKUs (product × branch × size)" value={num(report.totals.skus)} />
        <Tile label="Units in stock" value={num(report.totals.units)} />
        <Tile label="Stock value (at selling price)" value={inr(report.totals.value)} />
        <Tile label="Low / out of stock" value={num(report.statusCounts[1].value + report.statusCounts[2].value)} hint={`${report.statusCounts[2].value} out of stock`} />
      </div>
      <Grid2>
        <Card title="Stock Value by Category" subtitle="Current stock × selling price"><HBar data={report.valueByCategory} name="Stock value" /></Card>
        <Card title="Stock Status" subtitle="Number of SKUs by status (current)"><Donut data={report.statusCounts} centerLabel="SKUs" /></Card>
      </Grid2>
    </>
  )
}

export function BranchView({ report }) {
  return (
    <>
      <DemoNote className="mb-4">The branch report always compares every branch so you can see their relative performance; the branch filter does not narrow it.</DemoNote>
      <Grid2>
        <Card title="Branch-wise Revenue" subtitle="Selected period"><HBar data={report.bars} height={Math.max(160, report.bars.length * 56)} /></Card>
        <Card title="Revenue Trend by Branch" subtitle={`${{ day: 'Daily', week: 'Weekly', month: 'Monthly' }[report.unit]} revenue · selected period`}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={report.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} minTickGap={18} />
              <YAxis {...AXIS} width={56} tickFormatter={moneyAxis} />
              <Tooltip content={<ChartTooltip money />} cursor={{ stroke: '#9AA8A3', strokeWidth: 1 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#202B27' }} />
              {report.series.map((s) => <Line key={s.id} type="linear" dataKey={s.id} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Grid2>
    </>
  )
}

export function CustomerView({ report }) {
  const s = report.summary
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Customers who ordered" value={num(s.buyers)} />
        <Tile label="New (first order in period)" value={num(s.newCount)} hint={s.buyers ? `${((s.newCount / s.buyers) * 100).toFixed(0)}% of buyers` : undefined} />
        <Tile label="Returning" value={num(s.returning)} hint={`${num(s.repeat)} ordered more than once in period`} />
        <Tile label="Revenue per customer" value={inr(s.perCustomer)} />
      </div>
      <Card title="Revenue by City" subtitle="Top 8 cities in the selected period"><HBar data={report.cities} /></Card>
    </>
  )
}

export function OrderView({ report }) {
  return (
    <Grid2>
      <Card title="Orders by Status" subtitle="Selected period"><Donut data={report.statusData} centerLabel="orders" /></Card>
      <Card title="Orders by Payment Method" subtitle="Number of orders"><HBar data={report.methods} money={false} name="Orders" /></Card>
    </Grid2>
  )
}

export function ProfitView({ report, categories, costPct, onCostChange, onReset }) {
  const t = report.totals
  return (
    <>
      <DemoNote className="mb-4"><b>Estimate only.</b> Product cost prices are not recorded in the system yet, so cost is estimated as a percentage of net selling price (after discounts, excluding GST) per category. Adjust the percentages below to match your actual costs; they are not saved.</DemoNote>
      <Card title="Estimated cost % by category" className="mb-6 print:hidden"
        actions={<Button size="sm" variant="outline" icon={RotateCcw} onClick={onReset}>Reset to {DEFAULT_COST_PCT}%</Button>}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {categories.map((c) => (
            <div key={c} className="min-w-0">
              <label htmlFor={`cost-${c}`} className="label truncate" title={c}>{c}</label>
              <div className="relative">
                <input id={`cost-${c}`} type="number" inputMode="decimal" min={0} max={100} step={1} className="input pr-8"
                  value={costPct[c] ?? DEFAULT_COST_PCT} onChange={(e) => onCostChange(c, e.target.value)} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Net sales (ex-GST)" value={inr(t.net)} />
        <Tile label="Estimated cost" value={inr(t.cost)} />
        <Tile label="Est. gross profit" value={inr(t.profit)} />
        <Tile label="Est. gross margin" value={`${t.margin.toFixed(1)}%`} />
      </div>
      <Card title="Estimated Cost and Gross Profit by Category" subtitle="Bar length = net sales (ex-GST), split into estimated cost and gross profit">
        {report.byCategory.length ? (
          <ResponsiveContainer width="100%" height={Math.max(180, report.byCategory.length * 44 + 50)}>
            <BarChart data={report.byCategory} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke="#EDF1EF" horizontal={false} />
              <XAxis type="number" {...AXIS} tickFormatter={moneyAxis} />
              <YAxis type="category" dataKey="name" {...AXIS} width={110} tickFormatter={(v) => short(v, 15)} />
              <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(6,78,59,0.05)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#202B27' }} />
              <Bar dataKey="cost" name="Est. cost" stackId="a" fill={SERIES[2]} stroke="#fff" strokeWidth={1} maxBarSize={22} isAnimationActive={false} />
              <Bar dataKey="profit" name="Est. gross profit" stackId="a" fill={SERIES[0]} stroke="#fff" strokeWidth={1} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="py-16 text-center text-sm text-muted">No sales in this period</p>}
      </Card>
    </>
  )
}

// Presentational widgets for the Dashboard. All data is computed in Dashboard.jsx.
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Bot, Building2, CheckCircle2, Megaphone, MessageCircle, Package, Settings, ShoppingCart, Tags, UserPlus, Warehouse } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AXIS, ChartTooltip, moneyAxis } from '../../components/charts'
import { EmptyState, StatusBadge, Thumb } from '../../components/ui'
import { cn, inr, num, timeAgo } from '../../utils/format'
import { BRAND, BRAND_SOFT } from './chartKit'

const GRID_SOLID = { stroke: '#EDF1EF', vertical: false }

/** Single-series area chart with crosshair tooltip. metric: 'revenue' | 'orders' */
export function TrendArea({ data, metric = 'revenue', height = 280, name }) {
  const money = metric === 'revenue'
  const id = `grad-${metric}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_SOFT} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BRAND_SOFT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_SOLID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={18} />
        <YAxis {...AXIS} width={money ? 56 : 36} allowDecimals={false} tickFormatter={money ? moneyAxis : num} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ stroke: '#9AA8A3', strokeWidth: 1 }} />
        <Area type="monotone" dataKey={metric} name={name || (money ? 'Revenue' : 'Orders')} stroke={BRAND} strokeWidth={2} fill={`url(#${id})`}
          dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: BRAND }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Single-series bar chart. The last (current, partial) bucket is drawn lighter and labelled in the tooltip. */
export function RevenueBars({ data, height = 280, highlightLast = true, dataKey = 'revenue', name = 'Revenue', money = true }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid {...GRID_SOLID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={8} />
        <YAxis {...AXIS} width={money ? 56 : 36} allowDecimals={false} tickFormatter={money ? moneyAxis : num} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: 'rgba(6,78,59,0.05)' }} />
        <Bar dataKey={dataKey} name={name} radius={[4, 4, 0, 0]} maxBarSize={34} fill={BRAND_SOFT} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={d.key ?? i} fill={highlightLast && i === data.length - 1 ? '#86C5A0' : BRAND_SOFT} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RecentOrders({ orders, imageOf, branches }) {
  if (!orders.length) return <EmptyState icon={ShoppingCart} title="No orders in this period" text="Try a longer period or another branch." />
  return (
    <ul className="divide-y divide-line">
      {orders.map((o) => {
        const first = o.items[0]
        return (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface/70">
              <Thumb src={imageOf(first?.productId)} alt={first?.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold whitespace-nowrap text-primary">{o.number}</p>
                <p className="truncate text-xs text-ink">{o.customerName}</p>
                <p className="truncate text-xs text-muted">{first ? `${first.name} – ${first.size}` : '—'}{o.items.length > 1 ? ` +${o.items.length - 1} more` : ''} · {branches[o.branchId]?.code}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-ink">{inr(o.total)}</p>
                <StatusBadge status={o.status} className="mt-0.5" />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function TopProducts({ rows }) {
  if (!rows.length) return <EmptyState icon={Package} title="No sales in this period" />
  const max = Math.max(...rows.map((r) => r.revenue), 1)
  return (
    <ol className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.productId} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-xs font-semibold text-muted">{i + 1}</span>
          <Thumb src={r.image} alt={r.name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <Link to={`/products/${r.productId}`} className="truncate text-sm font-medium text-ink hover:text-primary">{r.name}</Link>
              <span className="shrink-0 text-sm font-semibold text-ink">{inr(r.revenue)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden><div className="h-full rounded-full bg-accent" style={{ width: `${(r.revenue / max) * 100}%` }} /></div>
              <span className="shrink-0 text-xs text-muted">{num(r.qty)} sold</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function BranchPerformance({ rows, selected }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0)
  if (!rows.length) return <EmptyState icon={Building2} title="No branches" />
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const share = total ? (r.revenue / total) * 100 : 0
        const on = selected === 'all' || selected === r.id
        return (
          <li key={r.id} className={cn('rounded-lg', !on && 'opacity-55')}>
            <div className="flex items-baseline justify-between gap-2">
              <Link to={`/branches/${r.id}`} className="min-w-0 truncate text-sm font-medium text-ink hover:text-primary">{r.name}</Link>
              <span className="shrink-0 text-sm font-semibold text-ink">{inr(r.revenue)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
              <span className="w-12 shrink-0 text-right text-xs font-medium text-ink tabular-nums">{share.toFixed(1)}%</span>
            </div>
            <p className="mt-1 text-xs text-muted">{num(r.orders)} orders · avg {inr(r.aov)} · {num(r.customers)} customers</p>
          </li>
        )
      })}
    </ul>
  )
}

export function LowStockList({ rows }) {
  if (!rows.length) return <EmptyState icon={CheckCircle2} title="All stock above alert levels" text="Nothing needs restocking right now." />
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id}>
          <Link to={`/inventory?q=${encodeURIComponent(r.productName)}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface/70">
            <Thumb src={r.image} alt={r.productName} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{r.productName} – {r.size}</p>
              <p className="truncate text-xs text-muted">{r.branchName} · alert at {r.alertStock}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn('text-sm font-bold', r.stock <= 0 ? 'text-red-600' : 'text-amber-600')}>{num(r.stock)} left</p>
              <StatusBadge status={r.stockStatus} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const ACT_ICON = { order: [ShoppingCart, 'bg-blue-50 text-blue-600'], product: [Package, 'bg-accent-soft text-primary'], price: [Tags, 'bg-violet-50 text-violet-600'], stock: [Warehouse, 'bg-amber-50 text-amber-600'], customer: [UserPlus, 'bg-teal-50 text-teal-600'], marketing: [Megaphone, 'bg-pink-50 text-pink-600'], branch: [Building2, 'bg-accent-soft text-primary'], whatsapp: [MessageCircle, 'bg-green-50 text-green-600'], chatbot: [Bot, 'bg-violet-50 text-violet-600'], settings: [Settings, 'bg-gray-100 text-gray-600'], alert: [AlertTriangle, 'bg-red-50 text-red-600'] }
export function ActivityFeed({ items }) {
  if (!items.length) return <EmptyState icon={Activity} title="No activity yet" />
  return (
    <ul className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
      {items.map((a) => {
        const [Icon, tone] = ACT_ICON[a.type] || [Activity, 'bg-gray-100 text-gray-600']
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-lg py-2.5">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', tone)}><Icon className="h-4 w-4" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink break-words">{a.message}</p>
              <p className="mt-0.5 text-xs text-muted"><span className="capitalize">{a.type}</span> · {a.user} · <time dateTime={a.at} title={new Date(a.at).toLocaleString('en-IN')}>{timeAgo(a.at)}</time></p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

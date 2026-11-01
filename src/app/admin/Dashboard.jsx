'use client'
import { useMemo } from 'react'
import { useNavigate } from './_lib/navigation'
import { ArrowRight, Building2, Clock, IndianRupee, Package, ShoppingCart, Users } from 'lucide-react'
import { Button, Card, FilterSelect, PageHeader, Segmented, StatCard } from './_components/ui'
import { useDb } from './_lib/store'
import { branchPerformance, byId, isRevenue, kpis, lowStock, ordersIn, productImage, topProducts, visibleActivities } from './_lib/selectors'
import { useAuth } from './_lib/auth'
import { growth, previousRange, resolveRange } from './_lib/dateRange'
import { date, inr, num } from './_lib/format'
import { STATUS_COLORS, STATUS_ORDER, timeSeries, trailingRange } from './_components/charts/chartKit'
import Donut from './_components/charts/Donut'
import { useNow } from './_lib/useNow'
import { useUrlState } from './_lib/useUrlState'
import { ActivityFeed, BranchPerformance, LowStockList, RecentOrders, RevenueBars, TopProducts, TrendArea } from './_components/charts/DashboardWidgets'

const PERIODS = [{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'year', label: 'This Year' }]
const PERIOD_LABEL = { today: 'today', week: 'this week', month: 'this month', year: 'this year' }
const DAY = 86400000

/** Window drawn by the Sales Overview chart for a period (padded so short periods still show a trend). */
function chartWindow(period, range, now) {
  if (period === 'year') return { range, unit: 'month' }
  const minDays = period === 'today' ? 14 : period === 'week' ? 7 : 14
  const from = new Date(Math.min(range.from.getTime(), new Date(now).setHours(0, 0, 0, 0) - (minDays - 1) * DAY))
  return { range: { from, to: now }, unit: 'day' }
}

export default function Dashboard() {
  const db = useDb()
  const navigate = useNavigate()
  const { can, user } = useAuth()
  const [q, setQ] = useUrlState({ period: 'month', branch: 'all', metric: 'revenue', trend: 'month' })
  const period = PERIODS.some((p) => p.value === q.period) ? q.period : 'month'
  const branch = q.branch || 'all'
  const metric = q.metric === 'orders' ? 'orders' : 'revenue'
  const trendUnit = q.trend === 'week' ? 'week' : 'month'
  const setParam = (k, v) => setQ({ [k]: v })
  const now = useNow()
  const d = useMemo(() => {
    const range = { from: resolveRange(period, {}, now).from, to: now }
    const prev = previousRange(range)
    const orders = ordersIn(db, range, branch)
    const prevOrders = ordersIn(db, prev, branch)
    const cur = kpis(orders)
    const old = kpis(prevOrders)
    const inBranch = (o) => branch === 'all' || o.branchId === branch
    const branchProducts = branch === 'all' ? db.products : db.products.filter((p) => db.variants.some((v) => v.productId === p.id && v.branchId === branch))
    const win = chartWindow(period, range, now)
    const statusCounts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]))
    orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })
    return {
      range, cur, old, orders,
      products: branchProducts.length,
      activeProducts: branchProducts.filter((p) => p.status === 'Active').length,
      branchesActive: db.branches.filter((b) => b.status === 'Active').length,
      pending: db.orders.filter((o) => o.status === 'Pending' && inBranch(o)).length,
      pendingInPeriod: orders.filter((o) => o.status === 'Pending').length,
      sales: timeSeries(db.orders.filter(inBranch), win.range, win.unit),
      salesWindow: win,
      trend: timeSeries(db.orders.filter(inBranch), trailingRange(trendUnit, 12, now), trendUnit),
      recent: [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6),
      top: topProducts(orders, 5, db),
      branchRows: branchPerformance(db, ordersIn(db, range, 'all')),
      low: lowStock(db).filter((r) => branch === 'all' || r.branchId === branch),
      statusData: STATUS_ORDER.map((s) => ({ name: s, value: statusCounts[s], color: STATUS_COLORS[s] })),
      cancelled: orders.filter((o) => !isRevenue(o)).length,
    }
  }, [db, period, branch, trendUnit, now])

  const branches = useMemo(() => byId(db.branches), [db.branches])
  const imageOf = (pid) => productImage(db, pid)
  const go = (module, to) => (can(module) ? () => navigate(to) : undefined)
  const branchName = branch === 'all' ? 'All branches' : branches[branch]?.name || 'Unknown branch'
  const periodText = PERIOD_LABEL[period]
  const changeLabel = period === 'today' ? 'vs yesterday (same time)' : 'vs previous period'
  const salesTotal = metric === 'revenue' ? inr(d.cur.revenue) : num(d.cur.orders)
  const salesGrowth = metric === 'revenue' ? growth(d.cur.revenue, d.old.revenue) : growth(d.cur.orders, d.old.orders)
  const win = d.salesWindow
  const firstName = user?.name?.split(' ')[0]

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back${firstName ? `, ${firstName}` : ''} — here is how the business is doing ${periodText}.`} breadcrumbs={[{ label: 'Dashboard' }]}
        actions={<>
          <Segmented options={PERIODS} value={period} onChange={(v) => setParam('period', v)} className="max-w-full overflow-x-auto" />
          <FilterSelect label="Branch" value={branch} onChange={(v) => setParam('branch', v)} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} />
        </>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Products" value={num(d.products)} icon={Package} hint={`${num(d.activeProducts)} active · ${num(d.products - d.activeProducts)} inactive`} onClick={go('products', '/products')} />
        <StatCard label="Total Orders" value={num(d.cur.orders)} icon={ShoppingCart} tone="blue" change={growth(d.cur.orders, d.old.orders)} changeLabel={changeLabel} onClick={go('orders', '/orders')} />
        <StatCard label="Revenue" value={inr(d.cur.revenue)} icon={IndianRupee} tone="teal" change={growth(d.cur.revenue, d.old.revenue)} changeLabel={changeLabel} onClick={go('reports', '/reports')} />
        <StatCard label="Branches" value={num(d.branchesActive)} icon={Building2} tone="purple" hint={`Active of ${num(db.branches.length)} total`} onClick={go('branches', '/branches')} />
        <StatCard label="Customers" value={num(d.cur.customers)} icon={Users} tone="amber" change={growth(d.cur.customers, d.old.customers)} changeLabel={`ordering ${changeLabel}`} onClick={go('customers', '/customers')} />
        <StatCard label="Pending Orders" value={num(d.pending)} icon={Clock} tone="red" hint={`${num(d.pendingInPeriod)} placed ${periodText} still pending`} onClick={go('orders', '/orders?status=Pending')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Sales Overview"
          subtitle={`${branchName} · ${win.unit === 'month' ? 'Monthly' : 'Daily'}, ${date(win.range.from)} – ${date(win.range.to)}`}
          actions={<Segmented options={[{ value: 'revenue', label: 'Revenue' }, { value: 'orders', label: 'Orders' }]} value={metric} onChange={(v) => setParam('metric', v)} />}>
          <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-2xl font-bold tracking-tight text-ink">{salesTotal}</p>
            <p className="pb-1 text-xs text-muted">
              <span className={salesGrowth >= 0 ? 'font-semibold text-accent' : 'font-semibold text-red-600'}>{salesGrowth >= 0 ? '▲' : '▼'} {Math.abs(salesGrowth).toFixed(1)}%</span> {metric === 'revenue' ? 'revenue' : 'orders'} {periodText} {changeLabel}
            </p>
          </div>
          <TrendArea data={d.sales} metric={metric} height={300} />
        </Card>

        <Card title="Recent Orders" subtitle={`Latest ${periodText} · ${branchName}`} bodyClassName="p-0"
          actions={can('orders') && <Button as="link" to="/orders" variant="ghost" size="sm" iconRight={ArrowRight}>View all</Button>}>
          <RecentOrders orders={d.recent} imageOf={imageOf} branches={branches} />
        </Card>

        <Card className="xl:col-span-2" title={trendUnit === 'month' ? 'Monthly Revenue' : 'Weekly Revenue'}
          subtitle={`Last 12 ${trendUnit === 'month' ? 'months' : 'weeks'} · ${branchName} · lighter bar = current ${trendUnit} so far`}
          actions={<Segmented options={[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} value={trendUnit} onChange={(v) => setParam('trend', v)} />}>
          <RevenueBars data={d.trend} />
        </Card>

        <Card title="Order Status" subtitle={`${num(d.cur.orders)} orders ${periodText} · ${num(d.cancelled)} cancelled/returned`}>
          <Donut data={d.statusData} centerLabel="orders" emptyText={`No orders ${periodText}`} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Top Selling Products" subtitle={`By revenue ${periodText}`}
          actions={can('reports') && <Button as="link" to="/reports?tab=product" variant="ghost" size="sm" iconRight={ArrowRight}>Report</Button>}>
          <TopProducts rows={d.top} />
        </Card>
        <Card title="Branch Performance" subtitle={`Revenue share ${periodText}${branch !== 'all' ? ' · selected branch highlighted' : ''}`}
          actions={can('branches') && <Button as="link" to="/branches" variant="ghost" size="sm" iconRight={ArrowRight}>Branches</Button>}>
          <BranchPerformance rows={d.branchRows} selected={branch} />
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1" title="Low Stock Alerts" subtitle={`${num(d.low.length)} at or below alert level`} bodyClassName="p-0"
          actions={can('inventory') && <Button as="link" to="/inventory" variant="ghost" size="sm" iconRight={ArrowRight}>Inventory</Button>}>
          <LowStockList rows={d.low.slice(0, 6)} />
        </Card>
      </div>

      <Card className="mt-6" title="Recent Activities" subtitle="Latest changes made in the admin panel and store">
        <ActivityFeed items={visibleActivities(db.activities, can).slice(0, 10)} />
      </Card>
    </>
  )
}

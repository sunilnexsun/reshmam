'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { BarChart3, Boxes, Building2, Crown, FileDown, FileSpreadsheet, FileText, IndianRupee, Package, PiggyBank, Printer, Receipt, ShoppingCart, TrendingUp, Users, Warehouse } from 'lucide-react'
import { Button, Card, DataTable, DateRangeFilter, FilterSelect, PageHeader, StatCard, Tabs, useToast } from '@admin/_components/ui'
import { useDb } from '@admin/_lib/store'
import { branchPerformance, byId, kpis, ordersIn, topProducts } from '@admin/_lib/selectors'
import { growth, previousRange, resolveRange } from '@admin/_lib/dateRange'
import { date, dateTime, inr } from '@admin/_lib/format'
import { exportCSV, exportExcel, exportPDF } from '@admin/_lib/export'
import { allCategories, branchReport, customerReport, DEFAULT_COST_PCT, exportColumns, inventoryReport, orderReport, productReport, profitReport, salesReport } from './reportData'
import { useNow } from '@admin/_lib/useNow'
import { useUrlState } from '@admin/_lib/useUrlState'
import { BranchView, CustomerView, InventoryView, OrderView, ProductView, ProfitView, SalesView } from './ReportViews'

const TABS = [
  { value: 'sales', label: 'Sales Report', icon: TrendingUp, build: salesReport, View: SalesView },
  { value: 'product', label: 'Product Report', icon: Package, build: productReport, View: ProductView },
  { value: 'inventory', label: 'Inventory Report', icon: Warehouse, build: inventoryReport, View: InventoryView },
  { value: 'branch', label: 'Branch Report', icon: Building2, build: branchReport, View: BranchView },
  { value: 'customer', label: 'Customer Report', icon: Users, build: customerReport, View: CustomerView },
  { value: 'order', label: 'Order Report', icon: Receipt, build: orderReport, View: OrderView },
  { value: 'profit', label: 'Profit Report', icon: PiggyBank, build: profitReport, View: ProfitView },
]
const PRESETS = ['today', 'week', 'month', 'lastMonth', '90d', 'year', 'custom']
const isoDate = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

export default function Reports() {
  const db = useDb()
  const toast = useToast()
  const [q, setQ] = useUrlState({ tab: 'sales', range: 'month', from: '', to: '', branch: 'all' })
  const tab = TABS.find((t) => t.value === q.tab) || TABS[0]
  const preset = PRESETS.includes(q.range) ? q.range : 'month'
  const { from, to } = q
  const branch = q.branch || 'all'
  const [costPct, setCostPct] = useState({})
  const [printing, setPrinting] = useState(false)

  // Resolve the period. "Custom" without a start date begins at the first order on record; "to" is capped at now.
  const now = useNow()
  const range = useMemo(() => {
    const r = resolveRange(preset, { from, to }, now)
    if (preset === 'custom' && !from && db.orders.length) {
      const first = db.orders.reduce((m, o) => (o.createdAt < m ? o.createdAt : m), db.orders[0].createdAt)
      r.from = new Date(first); r.from.setHours(0, 0, 0, 0)
    }
    if (r.to > now) r.to = now
    if (r.from > r.to) r.from = new Date(r.to.getFullYear(), r.to.getMonth(), r.to.getDate())
    return r
  }, [preset, from, to, db.orders, now])

  const branches = useMemo(() => byId(db.branches), [db.branches])
  const branchName = branch === 'all' ? 'All branches' : branches[branch]?.name || 'Unknown branch'
  const categories = useMemo(() => allCategories(db), [db])

  const { orders, stats, report } = useMemo(() => {
    const orders = ordersIn(db, range, branch)
    const allOrders = ordersIn(db, range, 'all')
    const cur = kpis(orders)
    const prev = kpis(ordersIn(db, previousRange(range), branch))
    const top = topProducts(orders, 1, db)[0]
    const bp = branchPerformance(db, orders).filter((b) => b.revenue > 0)
    const totalRev = bp.reduce((s, b) => s + b.revenue, 0)
    const report = tab.build({ db, orders, allOrders, range, branch, costPct })
    return { orders, stats: { cur, prev, top, topBranch: bp[0], topBranchShare: totalRev && bp[0] ? (bp[0].revenue / totalRev) * 100 : 0 }, report }
  }, [db, range, branch, tab, costPct])

  const periodText = `${date(range.from)} – ${date(range.to)}`
  const fileBase = `reshmam-${tab.value}-report-${isoDate(range.from)}_to_${isoDate(range.to)}${branch !== 'all' ? `-${branches[branch]?.code || branch}` : ''}`
  const scopeText = tab.value === 'branch' ? 'All branches (comparison)' : branchName

  const onExport = async (kind) => {
    if (!report.rows.length) return toast.warning('Nothing to export for this period and filter.')
    try {
      if (kind === 'csv') exportCSV(fileBase, report.rows, exportColumns(report.columns, false))
      else if (kind === 'xlsx') await exportExcel(fileBase, report.rows, exportColumns(report.columns, false), tab.label)
      else {
        const cols = exportColumns(report.columns, true)
        exportPDF(fileBase, report.title, report.rows, cols, {
          subtitle: `Period: ${periodText.replace('–', '-')}  |  Branch: ${scopeText.replace(/–/g, '-')}  |  Generated ${dateTime(new Date())}${tab.value === 'profit' ? '  |  Costs are ESTIMATES' : ''}`,
          orientation: cols.length > 6 ? 'landscape' : 'portrait',
        })
      }
      toast.success(`${tab.label} exported as ${kind === 'xlsx' ? 'Excel' : kind.toUpperCase()} (${report.rows.length} rows)`)
    } catch (e) {
      toast.error(`Export failed: ${e.message}`)
    }
  }

  // Print: render every table row (no pagination) while the print dialog is open — also for Ctrl+P.
  const beforePrint = useCallback(() => flushSync(() => setPrinting(true)), [])
  const afterPrint = useCallback(() => setPrinting(false), [])
  useEffect(() => {
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint) }
  }, [beforePrint, afterPrint])
  const onPrint = () => { beforePrint(); window.print() }

  const onCostChange = (cat, v) => {
    const n = v === '' ? 0 : Math.min(100, Math.max(0, Number(v)))
    if (Number.isFinite(n)) setCostPct((c) => ({ ...c, [cat]: n }))
  }
  const { View } = tab
  const exportBtns = (
    <>
      <Button variant="outline" size="sm" icon={FileDown} onClick={() => onExport('pdf')}>PDF</Button>
      <Button variant="outline" size="sm" icon={FileSpreadsheet} onClick={() => onExport('xlsx')}>Excel</Button>
      <Button variant="outline" size="sm" icon={FileText} onClick={() => onExport('csv')}>CSV</Button>
      <Button variant="primary" size="sm" icon={Printer} onClick={onPrint}>Print</Button>
    </>
  )

  return (
    <>
      <PageHeader title="Reports" subtitle="Business insights and analytics across sales, products, stock and branches." breadcrumbs={[{ label: 'Reports' }]} actions={exportBtns} />

      <div className="hidden print:mb-4 print:block">
        <p className="text-lg font-bold text-primary">RESHMAM · {report.title}</p>
        <p className="text-xs text-muted">Period: {periodText} · Branch: {scopeText} · Printed {dateTime(now)}</p>
      </div>

      <div className="card no-print mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-ink"><BarChart3 className="h-4 w-4 text-accent" aria-hidden />Filters</div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 md:ml-auto">
          <DateRangeFilter value={{ preset, from, to }} onChange={(v) => setQ({ range: v.preset, from: v.preset === 'custom' ? v.from || '' : '', to: v.preset === 'custom' ? v.to || '' : '' })} />
          <FilterSelect label="Branch" value={branch} onChange={(v) => setQ({ branch: v })} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} />
        </div>
        <p className="text-xs text-muted md:hidden">{periodText}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 print:grid-cols-6 sm:[&>*:nth-child(3)]:col-span-2 lg:[&>*]:col-span-3 lg:[&>*:nth-child(-n+3)]:col-span-2 print:[&>*]:col-span-3 print:[&>*:nth-child(-n+3)]:col-span-2">
        <StatCard label="Total Revenue" value={inr(stats.cur.revenue)} icon={IndianRupee} change={growth(stats.cur.revenue, stats.prev.revenue)} />
        <StatCard label="Total Orders" value={stats.cur.orders.toLocaleString('en-IN')} icon={ShoppingCart} tone="blue" change={growth(stats.cur.orders, stats.prev.orders)} />
        <StatCard label="Avg Order Value" value={inr(stats.cur.aov)} icon={Receipt} tone="purple" change={growth(stats.cur.aov, stats.prev.aov)} />
        <StatCard label="Top Product" value={stats.top?.name || '—'} icon={Crown} tone="amber" hint={stats.top ? `${inr(stats.top.revenue)} · ${stats.top.qty} units` : 'No sales in this period'} />
        <StatCard label="Top Branch" value={stats.topBranch?.name || '—'} icon={Boxes} tone="teal" hint={stats.topBranch ? `${inr(stats.topBranch.revenue)} · ${stats.topBranchShare.toFixed(1)}% of revenue` : 'No sales in this period'} />
      </div>

      <Tabs className="no-print mb-6" tabs={TABS.map(({ value, label, icon }) => ({ value, label, icon }))} value={tab.value} onChange={(v) => setQ({ tab: v })} />

      <div role="tabpanel" aria-label={tab.label} className="space-y-6">
        <View report={report} branchName={branchName} categories={categories} costPct={costPct} onCostChange={onCostChange} onReset={() => { setCostPct({}); toast.info(`Cost % reset to ${DEFAULT_COST_PCT}% for every category`) }} />

        <Card title={`${report.title} — Detail`} subtitle={`${report.rows.length} rows · ${periodText} · ${scopeText}${tab.value === 'inventory' ? ' · stock is current, “Sold” uses the period' : ''}`} bodyClassName="p-0"
          className="print:break-before-page">
          <DataTable key={`${tab.value}-${printing}`} columns={report.columns} rows={report.rows} rowKey={report.rowKey || 'id'} pageSize={printing ? 100000 : 10} />
        </Card>
      </div>
      <span className="sr-only" aria-live="polite">{orders.length} orders in the selected period</span>
    </>
  )
}

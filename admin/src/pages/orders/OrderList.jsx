import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Download, Eye, FileSpreadsheet, FileText, IndianRupee, Printer, RefreshCw, ShoppingBag, TrendingUp, X } from 'lucide-react'
import { Button, Card, DataTable, DateRangeFilter, Dropdown, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, Tabs, useConfirm, useToast } from '../../components/ui'
import { updateOrderStatus, useDb } from '../../services/store'
import { byId, isRevenue } from '../../services/selectors'
import { useAuth } from '../../services/auth'
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../data/seed'
import { RANGE_PRESETS, inRange, resolveRange } from '../../utils/dateRange'
import { date, inr, num } from '../../utils/format'
import { exportCSV, exportExcel } from '../../utils/export'
import { allowedNext, willRestock } from './orderUtils'
import RowMenu from './RowMenu'
import UpdateStatusModal from './UpdateStatusModal'

const PRESETS = [{ value: 'all', label: 'All Time' }, ...RANGE_PRESETS]
const BULK_STATUSES = ['Processing', 'Delivered', 'Cancelled', 'Returned']

export default function OrderList() {
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('orders', 'manage')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const tab = params.get('status') || 'all'
  const pay = params.get('payment') || 'all'
  const branch = params.get('branch') || 'all'
  const method = params.get('method') || 'all'
  const rPreset = params.get('range') || 'all'
  const rFrom = params.get('from') || ''
  const rTo = params.get('to') || ''
  const range = useMemo(() => ({ preset: rPreset, from: rFrom, to: rTo }), [rPreset, rFrom, rTo])
  const setParam = (k, v) => setParams((p) => { if (v && v !== 'all') p.set(k, v); else p.delete(k); return p }, { replace: true })
  const setRange = (r) => setParams((p) => {
    if (r.preset && r.preset !== 'all') p.set('range', r.preset); else p.delete('range')
    ;['from', 'to'].forEach((k) => { if (r.preset === 'custom' && r[k]) p.set(k, r[k]); else p.delete(k) })
    return p
  }, { replace: true })
  const [selected, setSelected] = useState([])
  const [statusFor, setStatusFor] = useState(null) // { order, status }

  const branches = useMemo(() => byId(db.branches), [db.branches])
  // Everything except the status tab — tab counts use this set.
  const base = useMemo(() => {
    const s = q.trim().toLowerCase()
    const digits = s.replace(/\D/g, '')
    const r = resolveRange(range.preset, range)
    return db.orders.filter((o) => (pay === 'all' || o.paymentStatus === pay) && (branch === 'all' || o.branchId === branch) && (method === 'all' || o.paymentMethod === method) &&
      (range.preset === 'all' || inRange(o.createdAt, r)) &&
      (!s || o.number.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s) || (digits.length >= 3 && o.customerPhone.replace(/\D/g, '').includes(digits))))
  }, [db.orders, q, pay, branch, method, range])
  const filtered = useMemo(() => (tab === 'all' ? base : base.filter((o) => o.status === tab)), [base, tab])
  const counts = useMemo(() => base.reduce((m, o) => ((m[o.status] = (m[o.status] || 0) + 1), m), {}), [base])
  const summary = useMemo(() => {
    const rev = filtered.filter(isRevenue)
    const revenue = rev.reduce((s, o) => s + o.total, 0)
    return { orders: filtered.length, revenue, pending: filtered.filter((o) => o.status === 'Pending').length, aov: rev.length ? revenue / rev.length : 0 }
  }, [filtered])
  const visibleSelected = selected.filter((id) => filtered.some((o) => o.id === id))
  const filtersActive = q || pay !== 'all' || branch !== 'all' || method !== 'all' || range.preset !== 'all'

  const quickChange = async (o, status) => {
    if (status === 'Shipped') return setStatusFor({ order: o, status })
    if (['Cancelled', 'Returned'].includes(status)) {
      const ok = await confirm({ title: `Mark ${o.number} ${status.toLowerCase()}?`, message: `${willRestock(o, status) ? 'All items will be added back to stock.' : 'Stock was not deducted for this order yet, so nothing is restored.'} This cannot be undone.`, confirmText: `Mark ${status}` })
      if (!ok) return
    }
    const restock = willRestock(o, status)
    let res
    try { res = updateOrderStatus(o.id, status, status === 'Cancelled' ? 'Order cancelled by admin' : status === 'Returned' ? 'Return received' : status === 'Processing' ? 'Payment confirmed, packing started' : 'Delivered to customer') } catch (e) { return toast.error(e.message) }
    toast.success(`${o.number} marked ${status}${restock ? ' · items restocked' : res?.deducted ? ' · stock deducted' : ''}`)
    res?.lowStock?.forEach((x) => toast.warning(`Low stock: ${x.sku} has ${x.stock} left`))
  }

  const bulkUpdate = async (status) => {
    const chosen = filtered.filter((o) => visibleSelected.includes(o.id))
    const ok = chosen.filter((o) => allowedNext(o).includes(status))
    const skipped = chosen.length - ok.length
    if (!ok.length) return toast.error(`None of the selected orders can move to ${status}. ${status === 'Delivered' ? 'Only Shipped orders can be delivered.' : ''}`)
    const restock = ok.filter((o) => willRestock(o, status)).length
    const yes = await confirm({ title: `Mark ${ok.length} order${ok.length > 1 ? 's' : ''} ${status}?`, tone: ['Cancelled', 'Returned'].includes(status) ? undefined : 'primary', confirmText: `Update ${ok.length}`,
      message: `${ok.length} order${ok.length > 1 ? 's' : ''} will be marked ${status}.${skipped ? ` ${skipped} selected order${skipped > 1 ? 's' : ''} can't move to ${status} and will be skipped.` : ''}${restock ? ` Items from ${restock} order${restock > 1 ? 's' : ''} will be restocked.` : ''}` })
    if (!yes) return
    const failed = []
    ok.forEach((o) => { try { updateOrderStatus(o.id, status, `Bulk update to ${status}`) } catch { failed.push(o.number) } })
    setSelected([])
    const done = ok.length - failed.length
    if (done) toast.success(`${done} order${done > 1 ? 's' : ''} marked ${status}${skipped ? ` · ${skipped} skipped` : ''}`)
    if (failed.length) toast.error(`Not enough stock to confirm ${failed.join(', ')}.`)
  }

  const exportCols = [
    { label: 'Order ID', key: 'number' }, { label: 'Date', value: (o) => date(o.createdAt) },
    { label: 'Customer', key: 'customerName' }, { label: 'Phone', key: 'customerPhone' }, { label: 'Email', key: 'customerEmail' },
    { label: 'City', value: (o) => o.shippingAddress?.city }, { label: 'Branch', value: (o) => branches[o.branchId]?.name },
    { label: 'Items', value: (o) => o.items.map((i) => `${i.name} ${i.size} x ${i.qty}`).join('; ') },
    { label: 'Subtotal (INR)', key: 'subtotal' }, { label: 'Shipping (INR)', key: 'shipping' }, { label: 'Discount (INR)', key: 'discount' }, { label: 'Coupon', key: 'couponCode' },
    { label: 'GST incl. (INR)', key: 'tax' }, { label: 'Total (INR)', key: 'total' },
    { label: 'Payment Method', key: 'paymentMethod' }, { label: 'Payment ID', key: 'paymentId' }, { label: 'Payment Status', key: 'paymentStatus' },
    { label: 'Order Status', key: 'status' }, { label: 'Courier', key: 'courier' }, { label: 'Tracking', key: 'trackingNumber' },
  ]
  const onExport = (kind) => {
    const name = `reshmam-orders-${new Date().toISOString().slice(0, 10)}`
    const rows = [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (kind === 'csv') exportCSV(name, rows, exportCols)
    else exportExcel(name, rows, exportCols, 'Orders')
    toast.success(`Exported ${rows.length} orders`)
  }

  const columns = [
    { key: 'number', label: 'Order ID', sortable: true, sortValue: (o) => Number(o.number.replace(/\D/g, '')), render: (o) => <span className="font-semibold whitespace-nowrap text-primary">{o.number}</span> },
    { key: 'customerName', label: 'Customer', sortable: true, render: (o) => <div className="min-w-[9rem]"><p className="font-medium text-ink">{o.customerName}</p><p className="text-xs whitespace-nowrap text-muted">{o.customerPhone}</p></div> },
    { key: 'items', label: 'Products', render: (o) => (
      <div className="w-[11.5rem]">
        <p className="truncate text-ink" title={o.items.map((i) => `${i.name} ${i.size} × ${i.qty}`).join(', ')}>{o.items[0]?.name}</p>
        <p className="text-xs text-muted">{o.items[0]?.size} × {o.items[0]?.qty}{o.items.length > 1 && <span className="ml-1.5 rounded-full bg-surface px-1.5 py-px font-medium text-ink">+{o.items.length - 1} more</span>}</p>
      </div>
    ) },
    { key: 'total', label: 'Total', sortable: true, align: 'right', render: (o) => <span className="font-semibold whitespace-nowrap">{inr(o.total)}</span> },
    { key: 'paymentStatus', label: 'Payment', sortable: true, render: (o) => <div><StatusBadge status={o.paymentStatus} /><p className="mt-0.5 text-[11px] whitespace-nowrap text-muted">{o.paymentMethod.replace(' (Razorpay)', '').replace('Cash on Delivery', 'COD')}</p></div> },
    { key: 'status', label: 'Status', sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (o) => <div className="whitespace-nowrap"><p>{date(o.createdAt)}</p><p className="text-xs text-muted">{new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p></div> },
    { key: 'actions', label: 'Actions', align: 'right', render: (o) => (
      <div className="flex justify-end gap-0.5">
        <IconButton icon={Eye} label={`View ${o.number}`} size="sm" onClick={() => navigate(`/orders/${o.id}`)} />
        {canManage && <RowMenu icon={RefreshCw} label={allowedNext(o).length ? `Change status of ${o.number}` : `${o.number} status is final`} heading="Move to" disabled={!allowedNext(o).length}
          items={allowedNext(o).map((s) => ({ label: s, danger: ['Cancelled', 'Returned'].includes(s), hint: s === 'Shipped' ? 'Needs courier & tracking no.' : willRestock(o, s) ? 'Restocks items' : undefined, onClick: () => quickChange(o, s) }))} />}
        <IconButton icon={Printer} label={`Print invoice for ${o.number}`} size="sm" onClick={() => navigate(`/orders/${o.id}?print=1`)} />
      </div>
    ) },
  ]

  const tabs = [{ value: 'all', label: 'All', count: base.length }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s, count: counts[s] || 0 }))]

  return (
    <>
      <PageHeader title="Orders" subtitle="Track, fulfil and manage every online order." breadcrumbs={[{ label: 'Orders' }]}
        actions={<Dropdown width="w-44" items={[{ label: 'Export CSV', icon: FileText, onClick: () => onExport('csv') }, { label: 'Export Excel', icon: FileSpreadsheet, onClick: () => onExport('xlsx') }]}
          trigger={(p) => <Button variant="outline" icon={Download} {...p}>Export</Button>} />} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={num(summary.orders)} icon={ShoppingBag} hint={filtersActive || tab !== 'all' ? 'Matching current filters' : 'All orders'} />
        <StatCard label="Revenue" value={inr(summary.revenue)} icon={IndianRupee} tone="blue" hint="Excludes cancelled & returned" />
        <StatCard label="Pending" value={num(summary.pending)} icon={Clock} tone="amber" hint="Awaiting confirmation" onClick={() => setParam('status', 'Pending')} />
        <StatCard label="Avg. Order Value" value={inr(summary.aov)} icon={TrendingUp} tone="purple" hint="Per revenue order" />
      </div>

      <Card bodyClassName="p-0">
        <Tabs tabs={tabs} value={tab} onChange={(v) => { setParam('status', v); setSelected([]) }} className="px-2" />
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search order ID, customer or phone" className="md:max-w-sm" />
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Payment status" value={pay} onChange={(v) => setParam('payment', v)} allLabel="All Payments" options={PAYMENT_STATUSES} />
            <FilterSelect label="Payment method" value={method} onChange={(v) => setParam('method', v)} allLabel="All Methods" options={PAYMENT_METHODS} />
            <FilterSelect label="Branch" value={branch} onChange={(v) => setParam('branch', v)} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} />
            <DateRangeFilter value={range} onChange={setRange} presets={PRESETS} />
            {filtersActive && <Button variant="ghost" size="sm" icon={X} className="h-9" onClick={() => setParams((p) => { ['q', 'payment', 'method', 'branch', 'range', 'from', 'to'].forEach((k) => p.delete(k)); return p }, { replace: true })}>Clear</Button>}
          </div>
        </div>
        {canManage && visibleSelected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/50 px-4 py-2.5 text-sm" role="region" aria-label="Bulk actions">
            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
            <span className="font-medium">{visibleSelected.length} selected</span>
            <Dropdown align="left" width="w-44" items={BULK_STATUSES.map((s) => ({ label: `Mark ${s}`, danger: ['Cancelled', 'Returned'].includes(s), onClick: () => bulkUpdate(s) }))}
              trigger={(p) => <Button size="sm" icon={RefreshCw} {...p}>Update status</Button>} />
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>
            <span className="text-xs text-muted sm:ml-auto">To ship, open each order — a tracking number is needed per order.</span>
          </div>
        )}
        <DataTable columns={columns} rows={filtered} onRowClick={(o) => navigate(`/orders/${o.id}`)} initialSort={{ key: 'createdAt', dir: 'desc' }}
          selectable={canManage} selected={visibleSelected} onSelect={setSelected} />
      </Card>

      <UpdateStatusModal open={!!statusFor} order={statusFor?.order} initialStatus={statusFor?.status} onClose={() => setStatusFor(null)} />
    </>
  )
}

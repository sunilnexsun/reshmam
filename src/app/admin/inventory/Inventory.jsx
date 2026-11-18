'use client'
import { useMemo, useState } from 'react'
import { useSearchParams } from '@admin/_lib/navigation'
import { AlertTriangle, ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, Boxes, Check, ClipboardList, History, IndianRupee, Layers, PackageX, Pencil, ReceiptText, SlidersHorizontal, TrendingDown, X } from 'lucide-react'
import { Badge, Button, Card, DataTable, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, Tabs, Thumb, useToast } from '@admin/_components/ui'
import { updateVariant, useDb } from '@admin/_lib/store'
import { byId, inventoryRows, lowStock } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { cn, inr, inrShort, num, timeAgo } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import { MOVE_TONE, STOCK_FILTERS, matchStockFilter, signed } from './inventoryUtils'
import StockOperationModal from './StockOperationModal'
import TransferModal from './TransferModal'
import HistoryModal from './HistoryModal'
import MovementsTab from './MovementsTab'
import TransfersTab from './TransfersTab'

const TABS = ['stock', 'movements', 'transfers']

export default function Inventory() {
  const db = useDb()
  const toast = useToast()
  const { can } = useAuth()
  const canManage = can('inventory', 'manage')
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'stock'
  const q = params.get('q') || ''
  const branch = params.get('branch') || 'all'
  const category = params.get('category') || 'all'
  const status = params.get('status') || 'all'
  const setParam = (k, v) => setParams((p) => { if (v && v !== 'all') p.set(k, v); else p.delete(k); return p }, { replace: true })
  const [op, setOp] = useState(null) // { type, variant }
  const [transfer, setTransfer] = useState(null) // { variant } | {}
  const [history, setHistory] = useState(null) // variant

  const rows = useMemo(() => inventoryRows(db), [db])
  const lastMove = useMemo(() => {
    const m = {}
    db.stockMovements.forEach((x) => { if (!m[x.variantId] || x.date > m[x.variantId].date) m[x.variantId] = x })
    return m
  }, [db.stockMovements])
  const categoryOptions = useMemo(() => {
    const fromDb = (db.categories || []).filter((c) => c.status !== 'Inactive').map((c) => c.name)
    if (fromDb.length > 0) return fromDb
    return Array.from(new Set(db.products.map((p) => p.category).filter(Boolean)))
  }, [db.categories, db.products])

  const inBranch = useMemo(() => rows.filter((r) => branch === 'all' || r.branchId === branch), [rows, branch])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return inBranch.filter((r) => (category === 'all' || r.category === category) && matchStockFilter(r, status) &&
      (!s || `${r.productName} ${r.sku} ${r.size} ${r.branchName}`.toLowerCase().includes(s)))
  }, [inBranch, q, category, status])
  const stats = useMemo(() => ({
    skus: inBranch.length,
    units: inBranch.reduce((s, r) => s + r.stock, 0),
    low: inBranch.filter((r) => r.stock > 0 && r.stock <= r.alertStock).length,
    out: inBranch.filter((r) => r.stock <= 0).length,
    value: inBranch.reduce((s, r) => s + Math.max(0, r.stock) * r.price, 0),
  }), [inBranch])
  const alerts = useMemo(() => lowStock(db).filter((r) => branch === 'all' || r.branchId === branch), [db, branch])
  const alertOut = alerts.filter((r) => r.stock <= 0)
  const branchName = branch === 'all' ? 'All branches' : byId(db.branches)[branch]?.name

  const openOp = (type, variant) => setOp({ type, variant })
  const onExport = () => {
    exportCSV(`reshmam-inventory-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Product', key: 'productName' }, { label: 'Category', key: 'category' }, { label: 'Size', key: 'size' }, { label: 'SKU', key: 'sku' }, { label: 'Branch', key: 'branchName' },
      { label: 'Stock', key: 'stock' }, { label: 'Alert', key: 'alertStock' }, { label: 'Status', key: 'stockStatus' }, { label: 'Selling Price (INR)', key: 'price' }, { label: 'Stock Value (INR)', value: (r) => Math.max(0, r.stock) * r.price },
    ])
    toast.success(`Exported ${filtered.length} stock rows`)
  }

  const columns = [
    { key: 'productName', label: 'Product', sortable: true, render: (r) => (
      <div className="flex w-[15rem] items-center gap-3">
        <Thumb src={r.image} alt={r.productName} size={40} />
        <div className="min-w-0"><p className="truncate font-medium text-ink" title={r.productName}>{r.productName}</p><p className="truncate text-xs text-muted">{r.sku}{(r.status !== 'Active' || r.product?.status === 'Inactive') && <Badge className="ml-1.5" tone="gray">Inactive</Badge>}</p></div>
      </div>
    ) },
    { key: 'branchName', label: 'Branch', sortable: true, render: (r) => <span className="whitespace-nowrap" title={r.branchName}>{r.branchName.split(' – ')[0]}</span> },
    { key: 'size', label: 'Size', sortable: true, render: (r) => <span className="whitespace-nowrap">{r.size}</span> },
    { key: 'stock', label: 'Stock', sortable: true, align: 'right', render: (r) => <span className={cn('text-base font-bold', r.stock <= 0 ? 'text-red-600' : r.stock <= r.alertStock ? 'text-amber-700' : 'text-ink')}>{num(r.stock)}</span> },
    { key: 'alertStock', label: 'Alert', sortable: true, align: 'right', render: (r) => <AlertLevelCell row={r} canManage={canManage} toast={toast} /> },
    { key: 'stockStatus', label: 'Status', sortable: true, sortValue: (r) => (r.stock <= 0 ? 0 : r.stock <= r.alertStock ? 1 : 2), render: (r) => <StatusBadge status={r.stockStatus} /> },
    { key: 'last', label: 'Last Move', sortable: true, sortValue: (r) => lastMove[r.id]?.date || '', render: (r) => { const m = lastMove[r.id]; return m ? <div className="whitespace-nowrap"><Badge tone={MOVE_TONE[m.type]}>{m.type} {signed(m.qty)}</Badge><p className="mt-0.5 text-xs text-muted">{timeAgo(m.date)}</p></div> : <span className="text-muted">—</span> } },
    { key: 'actions', label: 'Actions', align: 'right', render: (r) => (
      <div className="flex justify-end gap-0.5">
        {canManage && <IconButton size="sm" variant="primary" icon={ArrowDownToLine} label={`Stock in: ${r.productName} ${r.size} (${r.branchName})`} onClick={() => openOp('Stock In', r)} />}
        {canManage && <IconButton size="sm" icon={ArrowUpFromLine} label={`Stock out: ${r.productName} ${r.size} (${r.branchName})`} onClick={() => openOp('Stock Out', r)} disabled={r.stock <= 0} />}
        {canManage && <IconButton size="sm" icon={SlidersHorizontal} label={`Adjust: ${r.productName} ${r.size} (${r.branchName})`} onClick={() => openOp('Adjustment', r)} />}
        <IconButton size="sm" icon={History} label={`History: ${r.productName} ${r.size} (${r.branchName})`} onClick={() => setHistory(r)} />
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Inventory" subtitle="Branch-wise stock levels, movements and transfers." breadcrumbs={[{ label: 'Inventory' }]}
        actions={canManage && <>
          <Button icon={ArrowDownToLine} onClick={() => openOp('Stock In')}>Stock In</Button>
          <Button variant="outline" icon={ArrowUpFromLine} onClick={() => openOp('Stock Out')}>Stock Out</Button>
          <Button variant="outline" icon={ArrowRightLeft} onClick={() => setTransfer({})}>Transfer Stock</Button>
          <Button variant="outline" icon={SlidersHorizontal} onClick={() => openOp('Adjustment')}>Stock Adjustment</Button>
          <Button variant="outline" icon={ReceiptText} onClick={() => openOp('Purchase Entry')}>Purchase Entry</Button>
          <Button variant="danger-outline" icon={PackageX} onClick={() => openOp('Damaged')}>Damaged Stock</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatCard label="Total SKUs" value={num(stats.skus)} icon={Layers} hint={branchName} />
        <StatCard label="Total Units" value={num(stats.units)} icon={Boxes} tone="blue" hint="Units on hand" />
        <StatCard label="Low Stock" value={num(stats.low)} icon={TrendingDown} tone="amber" hint="At or below alert level" onClick={() => setParams((p) => { p.set('status', 'low'); p.delete('tab'); return p }, { replace: true })} />
        <StatCard label="Out of Stock" value={num(stats.out)} icon={PackageX} tone="red" hint="Zero units left" onClick={() => setParams((p) => { p.set('status', 'out'); p.delete('tab'); return p }, { replace: true })} />
        <StatCard label="Stock Value" value={inrShort(stats.value)} icon={IndianRupee} tone="purple" hint={`${inr(stats.value)} at selling price`} />
      </div>

      {alerts.length > 0 && (
        <div role="alert" className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1 text-sm text-amber-900">
            <p className="font-semibold">{alerts.length - alertOut.length} item{alerts.length - alertOut.length === 1 ? '' : 's'} low on stock{alertOut.length > 0 && <> · <span className="text-red-700">{alertOut.length} out of stock</span></>}</p>
            <p className="mt-0.5 truncate text-amber-800">{alerts.slice(0, 4).map((r) => `${r.productName} ${r.size} (${r.branchName.split(' – ')[0]}: ${r.stock})`).join(' · ')}{alerts.length > 4 ? ` · +${alerts.length - 4} more` : ''}</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 bg-white" onClick={() => setParams((p) => { p.set('status', 'attention'); p.delete('tab'); return p }, { replace: true })}>Show items to restock</Button>
        </div>
      )}

      <Card bodyClassName="p-0">
        <Tabs className="px-2" value={tab} onChange={(v) => setParam('tab', v === 'stock' ? '' : v)} tabs={[
          { value: 'stock', label: 'Stock', icon: Boxes, count: filtered.length },
          { value: 'movements', label: 'Stock Movements', icon: ClipboardList },
          { value: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
        ]} />
        {tab === 'stock' && <>
          <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
            <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search product, SKU or size" className="xl:w-72" />
            <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
              <FilterSelect label="Branch" value={branch} onChange={(v) => setParam('branch', v)} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} />
              <FilterSelect label="Category" value={category} onChange={(v) => setParam('category', v)} allLabel="All Categories" options={categoryOptions} />
              <FilterSelect label="Stock status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Stock Status" options={STOCK_FILTERS} className={status !== 'all' ? 'border-amber-300 bg-amber-50' : ''} />
              {(q || branch !== 'all' || category !== 'all' || status !== 'all') && <Button variant="ghost" size="sm" icon={X} className="h-9" onClick={() => setParams((p) => { ['q', 'branch', 'category', 'status'].forEach((k) => p.delete(k)); return p }, { replace: true })}>Clear</Button>}
              <Button variant="outline" size="sm" className="h-9" onClick={onExport} disabled={!filtered.length}>Export CSV</Button>
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} initialSort={{ key: 'stockStatus', dir: 'asc' }} pageSize={20} />
        </>}
        {tab === 'movements' && <MovementsTab db={db} params={params} setParam={setParam} setParams={setParams} onOpenHistory={setHistory} toast={toast} />}
        {tab === 'transfers' && <TransfersTab db={db} params={params} setParam={setParam} canManage={canManage} onNew={() => setTransfer({})} />}
      </Card>

      <StockOperationModal open={!!op} type={op?.type} variant={op?.variant} onClose={() => setOp(null)} />
      <TransferModal open={!!transfer} variant={transfer?.variant} onClose={() => setTransfer(null)} />
      <HistoryModal open={!!history} variant={history} onClose={() => setHistory(null)} />
    </>
  )
}

/** Inline editor for a variant's low-stock alert level. */
function AlertLevelCell({ row, canManage, toast }) {
  const [val, setVal] = useState(null) // null = not editing
  if (val === null) {
    return (
      <span className="inline-flex items-center justify-end gap-1">
        <span>{num(row.alertStock)}</span>
        {canManage && <IconButton size="sm" icon={Pencil} label={`Edit alert level for ${row.productName} ${row.size} (${row.branchName})`} className="h-7 w-7" onClick={() => setVal(String(row.alertStock))} />}
      </span>
    )
  }
  const n = Number(val)
  const valid = val !== '' && Number.isInteger(n) && n >= 0
  const save = () => {
    if (!valid) return toast.error('Alert level must be a whole number, 0 or more.')
    if (n !== row.alertStock) {
      updateVariant(row.id, { alertStock: n })
      toast.success(`Alert level for ${row.productName} ${row.size} set to ${n}`)
      if (row.stock > 0 && row.stock <= n) toast.warning(`${row.productName} ${row.size} (${row.stock}) is now below its alert level.`, { title: 'Low stock' })
    }
    setVal(null)
  }
  return (
    <form className="inline-flex items-center justify-end gap-1" onSubmit={(e) => { e.preventDefault(); save() }}>
      <input type="number" min={0} step={1} autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setVal(null)}
        aria-label={`Alert level for ${row.productName} ${row.size}`} className={cn('input h-8 w-20 px-2 text-right text-sm', !valid && 'input-error')} />
      <IconButton size="sm" icon={Check} label="Save alert level" variant="primary" className="h-7 w-7" onClick={save} />
      <IconButton size="sm" icon={X} label="Cancel" className="h-7 w-7" onClick={() => setVal(null)} />
    </form>
  )
}

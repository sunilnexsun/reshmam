import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Badge, Button, DataTable, DateRangeFilter, FilterSelect, SearchInput, Thumb } from '@admin/_components/ui'
import { byId } from '@admin/_lib/selectors'
import { STOCK_MOVEMENT_TYPES } from '@admin/_lib/seed'
import { RANGE_PRESETS, inRange, resolveRange } from '@admin/_lib/dateRange'
import { dateTime, num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import { MOVE_TONE, signed } from './inventoryUtils'

const PRESETS = [{ value: 'all', label: 'All Time' }, ...RANGE_PRESETS]

/** All stock movements with type / branch / date filters (state lives in the URL, owned by Inventory). */
export default function MovementsTab({ db, params, setParam, setParams, onOpenHistory, toast }) {
  const q = params.get('q') || ''
  const branch = params.get('branch') || 'all'
  const type = params.get('type') || 'all'
  const preset = params.get('mrange') || 'all'
  const from = params.get('mfrom') || ''
  const to = params.get('mto') || ''
  const range = useMemo(() => ({ preset, from, to }), [preset, from, to])
  const setRange = (r) => setParams((p) => {
    if (r.preset !== 'all') p.set('mrange', r.preset); else p.delete('mrange')
    if (r.preset === 'custom' && r.from) p.set('mfrom', r.from); else p.delete('mfrom')
    if (r.preset === 'custom' && r.to) p.set('mto', r.to); else p.delete('mto')
    return p
  }, { replace: true })

  const products = useMemo(() => byId(db.products), [db.products])
  const branches = useMemo(() => byId(db.branches), [db.branches])
  const variants = useMemo(() => byId(db.variants), [db.variants])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const r = resolveRange(range.preset, range)
    return db.stockMovements
      .map((m) => ({ ...m, productName: products[m.productId]?.name || 'Deleted product', size: variants[m.variantId]?.size || '—', sku: variants[m.variantId]?.sku || '', branchName: branches[m.branchId]?.name || '—', image: products[m.productId]?.images?.[0] }))
      .filter((m) => (branch === 'all' || m.branchId === branch) && (type === 'all' || m.type === type) && (range.preset === 'all' || inRange(m.date, r)) &&
        (!s || `${m.productName} ${m.sku} ${m.reference} ${m.notes}`.toLowerCase().includes(s)))
  }, [db.stockMovements, products, branches, variants, q, branch, type, range])
  const net = rows.reduce((t, m) => t + m.qty, 0)

  const onExport = () => {
    exportCSV(`reshmam-stock-movements-${new Date().toISOString().slice(0, 10)}`, [...rows].sort((a, b) => (a.date < b.date ? 1 : -1)), [
      { label: 'Date', value: (m) => dateTime(m.date) }, { label: 'Type', key: 'type' }, { label: 'Product', key: 'productName' }, { label: 'Size', key: 'size' }, { label: 'SKU', key: 'sku' },
      { label: 'Branch', key: 'branchName' }, { label: 'Qty', key: 'qty' }, { label: 'Balance', key: 'balance' }, { label: 'Reference', key: 'reference' }, { label: 'Notes', key: 'notes' }, { label: 'User', key: 'user' },
    ])
    toast.success(`Exported ${rows.length} movements`)
  }

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: (m) => <span className="whitespace-nowrap">{dateTime(m.date)}</span> },
    { key: 'productName', label: 'Product', sortable: true, render: (m) => (
      <button type="button" onClick={() => variants[m.variantId] && onOpenHistory(variants[m.variantId])} className="flex min-w-[12rem] items-center gap-3 text-left" title="View item history">
        <Thumb src={m.image} size={36} /><span className="min-w-0"><span className="block truncate font-medium text-ink hover:text-primary">{m.productName}</span><span className="block text-xs text-muted">{m.size}</span></span>
      </button>
    ) },
    { key: 'branchName', label: 'Branch', sortable: true, render: (m) => <span className="whitespace-nowrap">{m.branchName}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (m) => <Badge tone={MOVE_TONE[m.type]}>{m.type}</Badge> },
    { key: 'qty', label: 'Qty', sortable: true, align: 'right', render: (m) => <span className={m.qty > 0 ? 'font-semibold text-accent' : m.qty < 0 ? 'font-semibold text-red-600' : 'text-muted'}>{signed(m.qty)}</span> },
    { key: 'balance', label: 'Balance', align: 'right', render: (m) => num(m.balance) },
    { key: 'reference', label: 'Reference / Notes', render: (m) => <div className="max-w-[18rem] min-w-[10rem]"><p className="truncate">{m.reference || '—'}</p>{m.notes && <p className="truncate text-xs text-muted" title={m.notes}>{m.notes}</p>}</div> },
    { key: 'user', label: 'By', sortable: true, render: (m) => <span className="whitespace-nowrap">{m.user}</span> },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
        <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search product, SKU or reference" className="xl:w-72" />
        <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
          <FilterSelect label="Movement type" value={type} onChange={(v) => setParam('type', v)} allLabel="All Types" options={STOCK_MOVEMENT_TYPES} />
          <FilterSelect label="Branch" value={branch} onChange={(v) => setParam('branch', v)} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} />
          <DateRangeFilter value={range} onChange={setRange} presets={PRESETS} />
          <Button variant="outline" size="sm" icon={Download} className="h-9" onClick={onExport} disabled={!rows.length}>Export CSV</Button>
        </div>
      </div>
      <p className="border-b border-line bg-surface/50 px-4 py-2 text-xs text-muted">{num(rows.length)} movements · net change <b className={net >= 0 ? 'text-accent' : 'text-red-600'}>{signed(net)}</b> units</p>
      <DataTable columns={columns} rows={rows} initialSort={{ key: 'date', dir: 'desc' }} pageSize={20} />
    </>
  )
}

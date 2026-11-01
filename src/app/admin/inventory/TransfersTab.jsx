import { useMemo } from 'react'
import { ArrowRight, ArrowRightLeft } from 'lucide-react'
import { Button, DataTable, EmptyState, FilterSelect, SearchInput, Thumb } from '@admin/_components/ui'
import { byId } from '@admin/_lib/selectors'
import { dateTime, num } from '@admin/_lib/format'

/** Transfer Out / Transfer In movement pairs grouped by their TRF reference. */
export default function TransfersTab({ db, params, setParam, canManage, onNew }) {
  const q = params.get('q') || ''
  const branch = params.get('branch') || 'all'
  const products = useMemo(() => byId(db.products), [db.products])
  const branches = useMemo(() => byId(db.branches), [db.branches])
  const variants = useMemo(() => byId(db.variants), [db.variants])

  const transfers = useMemo(() => {
    const m = new Map()
    db.stockMovements.filter((x) => x.type === 'Transfer Out' || x.type === 'Transfer In').forEach((x) => {
      const key = x.reference || x.id
      const t = m.get(key) || { id: key, reference: x.reference || '—', date: x.date, productId: x.productId, qty: 0, from: null, to: null, user: x.user, notes: '' }
      if (x.type === 'Transfer Out') { t.from = x.branchId; t.qty = Math.abs(x.qty); t.size = variants[x.variantId]?.size }
      else { t.to = x.branchId; t.qty ||= Math.abs(x.qty); t.size ||= variants[x.variantId]?.size }
      // Seed transfers may only have the "In" leg — infer the source from the note ("From …").
      if (!t.from && x.type === 'Transfer In') { const b = db.branches.find((br) => x.notes?.includes(br.name)); if (b) t.from = b.id }
      const note = x.notes && !/^(From|To) /.test(x.notes) ? x.notes : ''
      t.notes ||= note
      m.set(key, t)
    })
    return [...m.values()].map((t) => ({ ...t, productName: products[t.productId]?.name || 'Deleted product', image: products[t.productId]?.images?.[0], fromName: branches[t.from]?.name || '—', toName: branches[t.to]?.name || '—' }))
  }, [db.stockMovements, db.branches, products, branches, variants])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return transfers.filter((t) => (branch === 'all' || t.from === branch || t.to === branch) && (!s || `${t.reference} ${t.productName}`.toLowerCase().includes(s)))
  }, [transfers, q, branch])

  const columns = [
    { key: 'reference', label: 'Reference', sortable: true, render: (t) => <span className="font-semibold whitespace-nowrap text-primary">{t.reference}</span> },
    { key: 'date', label: 'Date', sortable: true, render: (t) => <span className="whitespace-nowrap">{dateTime(t.date)}</span> },
    { key: 'productName', label: 'Product', sortable: true, render: (t) => <div className="flex min-w-[12rem] items-center gap-3"><Thumb src={t.image} size={36} /><div className="min-w-0"><p className="truncate font-medium">{t.productName}</p><p className="text-xs text-muted">{t.size || '—'}</p></div></div> },
    { key: 'route', label: 'From → To', render: (t) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{t.fromName}<ArrowRight className="h-3.5 w-3.5 text-accent" aria-label="to" />{t.toName}</span> },
    { key: 'qty', label: 'Qty', sortable: true, align: 'right', render: (t) => <b>{num(t.qty)}</b> },
    { key: 'notes', label: 'Notes', render: (t) => <span className="block max-w-[14rem] truncate text-muted" title={t.notes}>{t.notes || '—'}</span> },
    { key: 'user', label: 'By', render: (t) => <span className="whitespace-nowrap">{t.user}</span> },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search reference or product" className="md:w-72" />
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <FilterSelect label="Branch" value={branch} onChange={(v) => setParam('branch', v)} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} />
          {canManage && <Button size="sm" className="h-9" icon={ArrowRightLeft} onClick={onNew}>New Transfer</Button>}
        </div>
      </div>
      <DataTable columns={columns} rows={rows} initialSort={{ key: 'date', dir: 'desc' }}
        empty={<EmptyState icon={ArrowRightLeft} title="No transfers found" text={transfers.length ? 'Try changing the search or branch filter.' : 'Stock moved between branches will appear here.'} />} />
    </>
  )
}

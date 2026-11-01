import { useMemo } from 'react'
import { Badge, Button, DataTable, Modal, Thumb } from '@admin/_components/ui'
import { useDb } from '@admin/_lib/store'
import { dateTime, num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import { MOVE_TONE, signed } from './inventoryUtils'

/** Movement history of one variant (product × branch × size) with the balance after each movement. */
export default function HistoryModal({ open, variant, onClose }) {
  const db = useDb()
  const v = variant ? db.variants.find((x) => x.id === variant.id) || variant : null
  const product = v ? db.products.find((p) => p.id === v.productId) : null
  const branch = v ? db.branches.find((b) => b.id === v.branchId) : null
  const rows = useMemo(() => (v ? db.stockMovements.filter((m) => m.variantId === v.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : []), [db.stockMovements, v])
  const totals = useMemo(() => rows.reduce((t, m) => (m.qty > 0 ? { ...t, in: t.in + m.qty } : { ...t, out: t.out - m.qty }), { in: 0, out: 0 }), [rows])
  if (!v) return null

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: (m) => <span className="whitespace-nowrap">{dateTime(m.date)}</span> },
    { key: 'type', label: 'Type', render: (m) => <Badge tone={MOVE_TONE[m.type]}>{m.type}</Badge> },
    { key: 'qty', label: 'Qty', align: 'right', render: (m) => <span className={m.qty > 0 ? 'font-semibold text-accent' : m.qty < 0 ? 'font-semibold text-red-600' : ''}>{signed(m.qty)}</span> },
    { key: 'balance', label: 'Balance', align: 'right', render: (m) => <b>{num(m.balance)}</b> },
    { key: 'reference', label: 'Reference / Notes', render: (m) => <div className="max-w-[16rem] min-w-[10rem]"><p className="truncate">{m.reference || '—'}</p>{m.notes && <p className="truncate text-xs text-muted" title={m.notes}>{m.notes}</p>}</div> },
    { key: 'user', label: 'By', render: (m) => <span className="whitespace-nowrap">{m.user}</span> },
  ]
  const onExport = () => exportCSV(`stock-history-${v.sku}`, rows, [
    { label: 'Date', value: (m) => dateTime(m.date) }, { label: 'Type', key: 'type' }, { label: 'Qty', key: 'qty' }, { label: 'Balance', key: 'balance' },
    { label: 'Reference', key: 'reference' }, { label: 'Notes', key: 'notes' }, { label: 'User', key: 'user' },
  ])

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Stock History" subtitle={`${product?.name} · ${v.size} · ${branch?.name}`}
      footer={<><Button variant="outline" onClick={onExport} disabled={!rows.length}>Export CSV</Button><Button onClick={onClose}>Close</Button></>}>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Thumb src={product?.images?.[product.primaryImage || 0]} alt="" size={52} />
        <dl className="grid flex-1 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted">Current stock</dt><dd className="text-lg font-bold">{num(v.stock)}</dd></div>
          <div><dt className="text-xs text-muted">Alert level</dt><dd className="text-lg font-bold">{num(v.alertStock)}</dd></div>
          <div><dt className="text-xs text-muted">Total in</dt><dd className="text-lg font-bold text-accent">+{num(totals.in)}</dd></div>
          <div><dt className="text-xs text-muted">Total out</dt><dd className="text-lg font-bold text-red-600">−{num(totals.out)}</dd></div>
        </dl>
      </div>
      <div className="-mx-5 border-t border-line">
        <DataTable columns={columns} rows={rows} dense pageSize={10} empty={<p className="p-8 text-center text-sm text-muted">No stock movements recorded for this item yet.</p>} />
      </div>
    </Modal>
  )
}

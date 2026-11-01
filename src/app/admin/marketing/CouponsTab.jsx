import { useMemo, useState } from 'react'
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react'
import { Badge, Button, Card, DataTable, EmptyState, FilterSelect, IconButton, SearchInput, Toggle, useConfirm, useToast } from '@admin/_components/ui'
import { logActivity, removeItem, updateItem, useDb } from '@admin/_lib/store'
import { cn, date, inr, num } from '@admin/_lib/format'
import CouponFormModal from './CouponFormModal'
import { COUPON_TONE, couponState, todayISO } from './marketingUtils'

export default function CouponsTab({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [state, setStateFilter] = useState('all')
  const [editing, setEditing] = useState(undefined)
  const today = todayISO()

  const rows = useMemo(() => db.coupons.map((c) => ({ ...c, state: couponState(c, today), usagePct: c.usageLimit ? Math.min(100, ((c.used || 0) / c.usageLimit) * 100) : 0 })), [db.coupons, today])
  const filtered = rows.filter((c) => (state === 'all' || c.state === state) && (!q.trim() || `${c.code} ${c.description}`.toLowerCase().includes(q.trim().toLowerCase())))

  const toggle = (c) => {
    const status = c.status === 'Inactive' ? 'Active' : 'Inactive'
    updateItem('coupons', c.id, { status })
    logActivity('marketing', `Coupon ${c.code} ${status === 'Active' ? 'activated' : 'deactivated'}`)
    const next = couponState({ ...c, status }, today)
    toast.success(status === 'Active' ? (next === 'Active' ? `${c.code} activated` : `${c.code} enabled — currently ${next.toLowerCase()}`) : `${c.code} deactivated`)
  }
  const onDelete = async (c) => {
    if (!(await confirm({ title: 'Delete coupon?', message: `Delete coupon ${c.code}?${c.used ? ` It has been used ${c.used} times; past orders keep their discount.` : ''} Customers will no longer be able to apply it.`, confirmText: 'Delete' }))) return
    removeItem('coupons', c.id)
    logActivity('marketing', `Coupon deleted: ${c.code}`)
    toast.success(`Coupon ${c.code} deleted`)
  }

  const columns = [
    { key: 'code', label: 'Coupon', sortable: true, render: (c) => (
      <div className="min-w-[180px]">
        <span className="rounded-md border border-dashed border-accent/60 bg-accent-soft/40 px-2 py-0.5 font-mono text-[13px] font-semibold text-primary">{c.code}</span>
        <p className="mt-1 max-w-[260px] truncate text-xs text-muted" title={c.description}>{c.description || '—'}</p>
      </div>
    ) },
    { key: 'value', label: 'Discount', sortable: true, render: (c) => (
      <div className="whitespace-nowrap">
        <p className="font-semibold text-ink">{c.type === 'Percentage' ? `${c.value}% off` : `${inr(c.value)} off`}</p>
        <p className="text-xs text-muted">{c.type === 'Percentage' ? (c.maxDiscount ? `Max ${inr(c.maxDiscount)}` : 'No cap') : 'Flat'}</p>
      </div>
    ) },
    { key: 'minOrder', label: 'Min Order', sortable: true, align: 'right', render: (c) => (c.minOrder ? inr(c.minOrder) : '—') },
    { key: 'validTo', label: 'Validity', sortable: true, render: (c) => <span className="whitespace-nowrap text-[13px]">{date(c.validFrom)} – {date(c.validTo)}</span> },
    { key: 'used', label: 'Usage', sortable: true, sortValue: (c) => c.usagePct, render: (c) => (
      <div className="w-36">
        <div className="flex justify-between text-xs"><span className="font-medium text-ink">{num(c.used || 0)} / {num(c.usageLimit)}</span><span className="text-muted">{c.usagePct.toFixed(0)}%</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={`${c.code} usage`} aria-valuenow={Math.round(c.usagePct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn('h-full rounded-full', c.usagePct >= 90 ? 'bg-amber-500' : 'bg-accent')} style={{ width: `${c.usagePct}%` }} />
        </div>
      </div>
    ) },
    { key: 'state', label: 'Status', sortable: true, render: (c) => <Badge tone={COUPON_TONE[c.state]} dot>{c.state}</Badge> },
    ...(canManage ? [{ key: 'actions', label: 'Actions', align: 'right', render: (c) => (
      <div className="flex items-center justify-end gap-1">
        <Toggle size="sm" checked={c.status !== 'Inactive'} onChange={() => toggle(c)} label={`${c.status === 'Inactive' ? 'Activate' : 'Deactivate'} ${c.code}`} />
        <IconButton icon={Pencil} label={`Edit ${c.code}`} size="sm" variant="primary" onClick={() => setEditing(c)} />
        <IconButton icon={Trash2} label={`Delete ${c.code}`} size="sm" variant="danger" onClick={() => onDelete(c)} />
      </div>
    ) }] : []),
  ]

  return (
    <>
      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search coupon code or description" className="md:w-80" />
          <div className="flex flex-wrap gap-2 md:ml-auto">
            <FilterSelect label="Coupon status" value={state} onChange={setStateFilter} allLabel="All Status" options={['Active', 'Scheduled', 'Expired', 'Used up', 'Inactive']} />
            {canManage && <Button icon={Plus} size="sm" className="h-9" onClick={() => setEditing(null)}>Create Coupon</Button>}
          </div>
        </div>
        <DataTable columns={columns} rows={filtered} initialSort={{ key: 'validTo', dir: 'desc' }}
          empty={<EmptyState icon={Ticket} title={rows.length ? 'No coupons match' : 'No coupons yet'} text={rows.length ? 'Try a different search or status.' : 'Create a coupon code customers can apply at checkout.'} />} />
      </Card>
      <CouponFormModal open={editing !== undefined} coupon={editing} onClose={() => setEditing(undefined)} />
    </>
  )
}

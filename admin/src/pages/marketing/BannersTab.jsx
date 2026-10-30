import { useMemo, useState } from 'react'
import { ExternalLink, Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, FilterSelect, IconButton, StatusBadge, Toggle, useConfirm, useToast } from '../../components/ui'
import { logActivity, removeItem, updateItem, useDb } from '../../services/store'
import { num } from '../../utils/format'
import BannerFormModal from './BannerFormModal'
import { BANNER_POSITIONS } from './marketingUtils'

export default function BannersTab({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const [position, setPosition] = useState('all')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(undefined)

  const rows = useMemo(() => db.banners
    .filter((b) => (position === 'all' || b.position === position) && (status === 'all' || b.status === status))
    .sort((a, b) => (BANNER_POSITIONS.indexOf(a.position) - BANNER_POSITIONS.indexOf(b.position)) || (a.order - b.order)), [db.banners, position, status])

  const toggle = (b) => {
    const next = b.status === 'Active' ? 'Inactive' : 'Active'
    updateItem('banners', b.id, { status: next })
    logActivity('marketing', `Banner ${next === 'Active' ? 'activated' : 'deactivated'}: ${b.title}`)
    toast.success(`Banner ${next === 'Active' ? 'is now live' : 'hidden from the store'}`)
  }
  const onDelete = async (b) => {
    if (!(await confirm({ title: 'Delete banner?', message: `Delete the “${b.title}” banner? This cannot be undone.`, confirmText: 'Delete' }))) return
    removeItem('banners', b.id)
    logActivity('marketing', `Banner deleted: ${b.title}`)
    toast.success('Banner deleted')
  }

  return (
    <>
      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted">{num(rows.length)} banner{rows.length === 1 ? '' : 's'}</p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <FilterSelect label="Position" value={position} onChange={setPosition} allLabel="All Positions" options={BANNER_POSITIONS} />
            <FilterSelect label="Banner status" value={status} onChange={setStatus} allLabel="All Status" options={['Active', 'Inactive']} className="min-w-[7.5rem]" />
            {canManage && <Button icon={Plus} size="sm" className="h-9" onClick={() => setEditing(null)}>Add Banner</Button>}
          </div>
        </div>
        {rows.length ? (
          <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((b) => (
              <li key={b.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-white">
                <div className="relative aspect-[16/7] bg-gradient-to-br from-primary to-primary-light">
                  {b.image && <img src={b.image} alt={b.title} className="absolute inset-y-0 right-0 h-full w-1/2 object-contain p-2" loading="lazy" />}
                  <div className="relative max-w-[58%] p-4 text-white">
                    <p className="line-clamp-2 font-bold leading-tight">{b.title}</p>
                    {b.subtitle && <p className="mt-1 line-clamp-2 text-xs text-white/80">{b.subtitle}</p>}
                  </div>
                  <span className="absolute left-3 bottom-3"><StatusBadge status={b.status} className="bg-white" /></span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Badge tone="primary">{b.position}</Badge><span className="text-xs text-muted">Order {b.order}</span></div>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted"><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate font-mono">{b.link}</span></p>
                  {canManage && (
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                      <Toggle size="sm" checked={b.status === 'Active'} onChange={() => toggle(b)} label={b.status === 'Active' ? 'Live' : 'Hidden'} />
                      <div className="flex gap-1">
                        <IconButton icon={Pencil} label={`Edit banner ${b.title}`} size="sm" variant="primary" onClick={() => setEditing(b)} />
                        <IconButton icon={Trash2} label={`Delete banner ${b.title}`} size="sm" variant="danger" onClick={() => onDelete(b)} />
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ImageIcon} title={db.banners.length ? 'No banners match' : 'No banners yet'} text={db.banners.length ? 'Try another position or status.' : 'Add a banner to promote offers on the storefront.'}
            action={canManage && !db.banners.length && <Button icon={Plus} onClick={() => setEditing(null)}>Add Banner</Button>} />
        )}
      </Card>
      {editing !== undefined && <BannerFormModal key={editing?.id || 'new'} open banner={editing} onClose={() => setEditing(undefined)} />}
    </>
  )
}

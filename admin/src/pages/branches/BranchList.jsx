import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Boxes, Building2, CheckCircle2, Download, Eye, IndianRupee, LayoutGrid, List, Mail, MapPin, MoreVertical, Package, Pencil, Phone, Plus, Power, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Card, DataTable, Dropdown, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, Segmented, StatCard, StatusBadge, useToast } from '../../components/ui'
import { useDb } from '../../services/store'
import { useAuth } from '../../services/auth'
import { inr, num } from '../../utils/format'
import { exportCSV } from '../../utils/export'
import BranchFormModal from './BranchFormModal'
import { branchStats, location } from './branchData'
import { useBranchActions } from './useBranchActions'

export default function BranchList() {
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const canManage = can('branches', 'manage')
  const { toggleStatus, remove } = useBranchActions()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const status = params.get('status') || 'all'
  const view = params.get('view') === 'table' ? 'table' : 'cards'
  const setParam = (k, v) => setParams((p) => { if (v && v !== 'all' && !(k === 'view' && v === 'cards')) p.set(k, v); else p.delete(k); return p }, { replace: true })
  const [editing, setEditing] = useState(undefined)

  const stats = useMemo(() => branchStats(db), [db])
  const rows = useMemo(() => db.branches.map((b) => ({ ...b, ...stats[b.id], location: location(b) })), [db.branches, stats])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((b) => (status === 'all' || b.status === status) && (!s || `${b.name} ${b.code} ${b.city} ${b.manager} ${b.phone} ${b.email}`.toLowerCase().includes(s)))
  }, [rows, q, status])

  const totals = useMemo(() => ({
    active: rows.filter((b) => b.status === 'Active').length,
    stock: rows.reduce((s, b) => s + b.stock, 0),
    revenue: rows.reduce((s, b) => s + b.monthRevenue, 0),
    products: new Set(db.variants.map((v) => v.productId)).size,
  }), [rows, db.variants])

  const onExport = () => {
    exportCSV(`reshmam-branches-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Branch', key: 'name' }, { label: 'Code', key: 'code' }, { label: 'Address', key: 'address' }, { label: 'City', key: 'city' },
      { label: 'State', key: 'state' }, { label: 'Pincode', key: 'pincode' }, { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' },
      { label: 'Manager', key: 'manager' }, { label: 'Status', key: 'status' }, { label: 'Products', key: 'products' },
      { label: 'Stock Units', key: 'stock' }, { label: 'Revenue This Month (INR)', key: 'monthRevenue' },
    ])
    toast.success(`Exported ${filtered.length} branches`)
  }

  const menu = (b) => [
    { label: 'View details', icon: Eye, onClick: () => navigate(`/branches/${b.id}`) },
    canManage && { label: 'Edit', icon: Pencil, onClick: () => setEditing(b) },
    canManage && { label: b.status === 'Active' ? 'Deactivate' : 'Activate', icon: Power, onClick: () => toggleStatus(b) },
    canManage && { divider: true },
    canManage && { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(b) },
  ]

  const columns = [
    { key: 'name', label: 'Branch', sortable: true, render: (b) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary"><Building2 className="h-4 w-4" /></span>
        <div className="min-w-0"><Link to={`/branches/${b.id}`} className="font-medium text-ink hover:text-primary">{b.name}</Link><p className="text-xs text-muted">{b.manager || '—'}</p></div>
      </div>
    ) },
    { key: 'code', label: 'Code', sortable: true, render: (b) => <span className="font-mono text-xs font-semibold">{b.code}</span> },
    { key: 'location', label: 'Location', sortable: true, render: (b) => <span className="whitespace-nowrap">{b.location}</span> },
    { key: 'phone', label: 'Contact', render: (b) => <span className="whitespace-nowrap">{b.phone}</span> },
    { key: 'products', label: 'Products', sortable: true, align: 'right', render: (b) => num(b.products) },
    { key: 'stock', label: 'Stock Units', sortable: true, align: 'right', render: (b) => num(b.stock) },
    { key: 'monthRevenue', label: 'Revenue (Month)', sortable: true, align: 'right', render: (b) => <span className="font-medium">{inr(b.monthRevenue)}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (b) => <StatusBadge status={b.status} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: (b) => (
      <div className="flex justify-end gap-1">
        <IconButton icon={Eye} label={`View ${b.name}`} size="sm" onClick={() => navigate(`/branches/${b.id}`)} />
        {canManage && <IconButton icon={Pencil} label={`Edit ${b.name}`} size="sm" variant="primary" onClick={() => setEditing(b)} />}
        {canManage && <IconButton icon={Power} label={b.status === 'Active' ? `Deactivate ${b.name}` : `Activate ${b.name}`} size="sm" onClick={() => toggleStatus(b)} />}
        {canManage && <IconButton icon={Trash2} label={`Delete ${b.name}`} size="sm" variant="danger" onClick={() => remove(b)} />}
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Branches" subtitle="Manage your store and warehouse locations." breadcrumbs={[{ label: 'Branches' }]}
        actions={<>
          <Button variant="outline" icon={Download} onClick={onExport}>Export CSV</Button>
          {canManage && <Button icon={Plus} onClick={() => setEditing(null)}>Add Branch</Button>}
        </>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Branches" value={num(rows.length)} icon={Building2} hint={`${totals.active} active`} />
        <StatCard label="Products Stocked" value={num(totals.products)} icon={Package} tone="blue" hint="Distinct products across branches" />
        <StatCard label="Stock Units" value={num(totals.stock)} icon={Boxes} tone="purple" hint="All branches combined" />
        <StatCard label="Revenue This Month" value={inr(totals.revenue)} icon={IndianRupee} tone="amber" hint="Excludes cancelled & returned orders" />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search name, code, city or manager" className="md:w-80" />
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <FilterSelect label="Status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={['Active', 'Inactive']} />
            <Segmented value={view} onChange={(v) => setParam('view', v)} options={[{ value: 'cards', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Cards</span> }, { value: 'table', label: <span className="inline-flex items-center gap-1.5"><List className="h-3.5 w-3.5" />Table</span> }]} />
          </div>
        </div>
        {view === 'table' ? (
          <DataTable columns={columns} rows={filtered} onRowClick={(b) => navigate(`/branches/${b.id}`)} initialSort={{ key: 'monthRevenue', dir: 'desc' }} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="No branches found" text={rows.length ? 'Try changing the search or status filter.' : 'Add your first branch to start assigning stock and prices.'}
            action={canManage && !rows.length && <Button icon={Plus} onClick={() => setEditing(null)}>Add Branch</Button>} />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((b) => (
              <article key={b.id} className="flex min-w-0 flex-col rounded-xl border border-line bg-white transition hover:border-accent/40 hover:shadow-md">
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/branches/${b.id}`} className="block truncate font-semibold text-ink hover:text-primary">{b.name}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge tone="primary" className="font-mono">{b.code}</Badge><StatusBadge status={b.status} /></div>
                  </div>
                  <Dropdown items={menu(b)} trigger={(p) => <IconButton icon={MoreVertical} label={`Actions for ${b.name}`} size="sm" {...p} />} />
                </div>
                <ul className="space-y-2 px-4 text-[13px] text-muted">
                  <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="min-w-0 break-words">{b.address}, {b.location} {b.pincode}</span></li>
                  <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /><a href={`tel:${b.phone.replace(/\s/g, '')}`} className="hover:text-primary">{b.phone}</a></li>
                  <li className="flex min-w-0 items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><a href={`mailto:${b.email}`} className="truncate hover:text-primary">{b.email}</a></li>
                  <li className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5 shrink-0" />Manager: <span className="font-medium text-ink">{b.manager || '—'}</span></li>
                </ul>
                <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line text-center">
                  <div className="px-2 py-3"><dt className="text-[11px] text-muted">Products</dt><dd className="mt-0.5 font-semibold">{num(b.products)}</dd></div>
                  <div className="px-2 py-3"><dt className="text-[11px] text-muted">Stock units</dt><dd className="mt-0.5 font-semibold">{num(b.stock)}</dd></div>
                  <div className="px-2 py-3"><dt className="text-[11px] text-muted">Revenue (month)</dt><dd className="mt-0.5 truncate font-semibold">{inr(b.monthRevenue)}</dd></div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-line p-3">
                  <Button size="sm" variant="secondary" icon={Eye} as="link" to={`/branches/${b.id}`} className="flex-1">View</Button>
                  {canManage && <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(b)} className="flex-1">Edit</Button>}
                  {canManage && <Button size="sm" variant="outline" icon={b.status === 'Active' ? Power : CheckCircle2} onClick={() => toggleStatus(b)} className="flex-1">{b.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <BranchFormModal open={editing !== undefined} branch={editing} onClose={() => setEditing(undefined)} />
    </>
  )
}

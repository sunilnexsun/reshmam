'use client'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from '@admin/_lib/navigation'
import { Download, Eye, Pencil, Plus, Repeat, Trash2, UserCheck, UserPlus, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, DataTable, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { removeItem, logActivity, useDb } from '@admin/_lib/store'
import { customerStats } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { date, inr, num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import CustomerFormModal from './CustomerFormModal'

export default function CustomerList() {
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('customers', 'manage')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const status = params.get('status') || 'all'
  const city = params.get('city') || 'all'
  const setParam = (k, v) => setParams((p) => { if (v && v !== 'all') p.set(k, v); else p.delete(k); return p }, { replace: true })
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit

  const stats = useMemo(() => customerStats(db), [db])
  const rows = useMemo(() => db.customers.map((c) => ({ ...c, orders: stats[c.id]?.orders || 0, spent: stats[c.id]?.spent || 0, lastOrder: stats[c.id]?.last })), [db.customers, stats])
  const cities = useMemo(() => [...new Set(db.customers.map((c) => c.address.city))].sort(), [db.customers])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((c) => (status === 'all' || c.status === status) && (city === 'all' || c.address.city === city) &&
      (!s || `${c.name} ${c.phone} ${c.email} ${c.address.city}`.toLowerCase().includes(s)))
  }, [rows, q, status, city])

  const summary = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    return {
      total: rows.length,
      active: rows.filter((c) => c.status === 'Active').length,
      newThisMonth: rows.filter((c) => new Date(c.createdAt) >= monthStart).length,
      repeat: rows.filter((c) => c.orders > 1).length,
    }
  }, [rows])

  const onDelete = async (c) => {
    const ok = await confirm({ title: 'Delete customer?', message: c.orders ? `${c.name} has ${c.orders} orders. Their order records will be kept, but the customer profile will be removed.` : `Delete ${c.name}? This cannot be undone.`, confirmText: 'Delete' })
    if (!ok) return
    removeItem('customers', c.id)
    logActivity('customer', `Customer deleted: ${c.name}`)
    toast.success('Customer deleted')
  }
  const onExport = () => {
    exportCSV(`reshmam-customers-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Name', key: 'name' }, { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' },
      { label: 'City', value: (c) => c.address.city }, { label: 'State', value: (c) => c.address.state }, { label: 'Pincode', value: (c) => c.address.pincode },
      { label: 'Total Orders', key: 'orders' }, { label: 'Total Spent (INR)', key: 'spent' },
      { label: 'Registered', value: (c) => date(c.createdAt) }, { label: 'Status', key: 'status' },
    ])
    toast.success(`Exported ${filtered.length} customers`)
  }

  const columns = [
    { key: 'name', label: 'Customer', sortable: true, render: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={c.name} />
        <div className="min-w-0"><p className="flex items-center gap-1.5 font-medium text-ink">{c.name}{c.tags?.includes('Wholesale') && <Badge tone="blue">Wholesale</Badge>}</p><p className="truncate text-xs text-muted">{c.email || '—'}</p></div>
      </div>
    ) },
    { key: 'phone', label: 'Phone', render: (c) => <span className="whitespace-nowrap">{c.phone}</span> },
    { key: 'city', label: 'City', sortable: true, sortValue: (c) => c.address.city, render: (c) => c.address.city },
    { key: 'orders', label: 'Total Orders', sortable: true, align: 'right', render: (c) => num(c.orders) },
    { key: 'spent', label: 'Total Spent', sortable: true, align: 'right', render: (c) => <span className="font-medium">{inr(c.spent)}</span> },
    { key: 'createdAt', label: 'Registered', sortable: true, render: (c) => <span className="whitespace-nowrap">{date(c.createdAt)}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (c) => <StatusBadge status={c.status} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: (c) => (
      <div className="flex justify-end gap-1">
        <IconButton icon={Eye} label={`View ${c.name}`} size="sm" onClick={() => navigate(`/customers/${c.id}`)} />
        {canManage && <IconButton icon={Pencil} label={`Edit ${c.name}`} size="sm" variant="primary" onClick={() => setEditing(c)} />}
        {canManage && <IconButton icon={Trash2} label={`Delete ${c.name}`} size="sm" variant="danger" onClick={() => onDelete(c)} />}
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has ordered or registered on the store." breadcrumbs={[{ label: 'Customers' }]}
        actions={<>
          <Button variant="outline" icon={Download} onClick={onExport}>Export CSV</Button>
          {canManage && <Button icon={Plus} onClick={() => setEditing(null)}>Add Customer</Button>}
        </>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={num(summary.total)} icon={Users} />
        <StatCard label="Active Customers" value={num(summary.active)} icon={UserCheck} tone="blue" />
        <StatCard label="New This Month" value={num(summary.newThisMonth)} icon={UserPlus} tone="purple" />
        <StatCard label="Repeat Customers" value={num(summary.repeat)} icon={Repeat} tone="amber" hint={`${summary.total ? Math.round((summary.repeat / summary.total) * 100) : 0}% of customers ordered more than once`} />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search name, phone, email or city" className="md:w-80" />
          <div className="flex flex-wrap gap-2 md:ml-auto">
            <FilterSelect label="Status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={['Active', 'Inactive']} />
            <FilterSelect label="City" value={city} onChange={(v) => setParam('city', v)} allLabel="All Cities" options={cities} />
          </div>
        </div>
        <DataTable columns={columns} rows={filtered} onRowClick={(c) => navigate(`/customers/${c.id}`)} initialSort={{ key: 'createdAt', dir: 'desc' }} />
      </Card>

      <CustomerFormModal open={editing !== undefined} customer={editing} onClose={() => setEditing(undefined)} />
    </>
  )
}

'use client'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@admin/_lib/navigation'
import { IndianRupee, Mail, MapPin, MessageCircle, Pencil, Phone, ShoppingBag, Trash2, TrendingUp, CalendarClock } from 'lucide-react'
import { Avatar, Badge, Button, Card, DataTable, InfoList, PageHeader, StatCard, StatusBadge, Textarea, useConfirm, useToast } from '@admin/_components/ui'
import { logActivity, removeItem, updateItem, useDb } from '@admin/_lib/store'
import { byId, isRevenue, netRevenue } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { date, dateTime, inr, num } from '@admin/_lib/format'
import NotFound from '@admin/_components/NotFound'
import CustomerFormModal from './CustomerFormModal'

export default function CustomerDetails() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('customers', 'manage')
  const customer = db.customers.find((c) => c.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState(null) // null = not editing

  const orders = useMemo(() => db.orders.filter((o) => o.customerId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [db.orders, id])
  const branches = useMemo(() => byId(db.branches), [db.branches])
  if (!customer) return <NotFound title="Customer not found" back="/customers" backLabel="Back to Customers" />

  const paid = orders.filter(isRevenue)
  const spent = paid.reduce((s, o) => s + netRevenue(o), 0)
  const waNumber = customer.phone.replace(/\D/g, '')
  const a = customer.address

  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete customer?', message: `Delete ${customer.name}? Their ${orders.length} order records will be kept.`, confirmText: 'Delete' }))) return
    removeItem('customers', customer.id)
    logActivity('customer', `Customer deleted: ${customer.name}`)
    toast.success('Customer deleted')
    navigate('/customers')
  }
  const saveNotes = () => {
    updateItem('customers', customer.id, { notes: notes.trim() })
    setNotes(null)
    toast.success('Notes saved')
  }

  const columns = [
    { key: 'number', label: 'Order ID', sortable: true, render: (o) => <span className="font-medium text-primary">{o.number}</span> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (o) => date(o.createdAt) },
    { key: 'items', label: 'Products', render: (o) => <span className="text-muted">{o.items.map((i) => `${i.name} ${i.size} × ${i.qty}`).join(', ')}</span>, className: 'max-w-xs truncate' },
    { key: 'branch', label: 'Branch', render: (o) => branches[o.branchId]?.name },
    { key: 'total', label: 'Total', sortable: true, align: 'right', render: (o) => <b>{inr(o.total)}</b> },
    { key: 'paymentStatus', label: 'Payment', render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
  ]

  return (
    <>
      <PageHeader title={customer.name} breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: customer.name }]}
        actions={<>
          <Button as="a" variant="accent" icon={MessageCircle} href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
          {canManage && <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>}
          {canManage && <Button variant="danger-outline" icon={Trash2} onClick={onDelete}>Delete</Button>}
        </>} />

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar name={customer.name} size={72} />
              <p className="mt-3 text-lg font-semibold">{customer.name}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5"><StatusBadge status={customer.status} />{customer.tags?.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted" /><a href={`tel:${waNumber}`} className="hover:text-primary">{customer.phone}</a></li>
              <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted" />{customer.email ? <a href={`mailto:${customer.email}`} className="truncate hover:text-primary">{customer.email}</a> : '—'}</li>
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-muted" /><span>{[a.line1, a.line2, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(', ')}</span></li>
              <li className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-muted" />WhatsApp updates: {customer.whatsappOptIn ? <Badge tone="green">Opted in</Badge> : <Badge>Not opted in</Badge>}</li>
            </ul>
          </Card>
          <Card title="Account">
            <InfoList items={[['Customer ID', customer.id], ['Registered', date(customer.createdAt)], ['Last order', orders[0] ? dateTime(orders[0].createdAt) : '—'], ['Preferred branch', orders.length ? branches[Object.entries(orders.reduce((m, o) => ((m[o.branchId] = (m[o.branchId] || 0) + 1), m), {})).sort((x, y) => y[1] - x[1])[0][0]]?.name : '—']]} />
          </Card>
          <Card title="Notes" actions={canManage && notes === null && <Button size="sm" variant="outline" icon={Pencil} onClick={() => setNotes(customer.notes || '')}>Edit</Button>}>
            {notes === null ? <p className="whitespace-pre-wrap text-sm text-ink">{customer.notes || <span className="text-muted">No notes yet.</span>}</p> : (
              <div className="space-y-2">
                <Textarea aria-label="Customer notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setNotes(null)}>Cancel</Button><Button size="sm" onClick={saveNotes}>Save Notes</Button></div>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Total Orders" value={num(orders.length)} icon={ShoppingBag} />
            <StatCard label="Total Spent" value={inr(spent)} icon={IndianRupee} tone="blue" />
            <StatCard label="Average Order" value={inr(paid.length ? spent / paid.length : 0)} icon={TrendingUp} tone="purple" />
            <StatCard label="Last Order" value={orders[0] ? date(orders[0].createdAt) : '—'} icon={CalendarClock} tone="amber" />
          </div>
          <Card title="Order History" subtitle={`${orders.length} orders`} bodyClassName="p-0">
            <DataTable columns={columns} rows={orders} rowKey="id" onRowClick={(o) => navigate(`/orders/${o.id}`)} pageSize={10} />
          </Card>
        </div>
      </div>

      <CustomerFormModal open={editOpen} customer={customer} onClose={() => setEditOpen(false)} />
    </>
  )
}

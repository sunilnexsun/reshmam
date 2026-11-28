'use client'
import { useMemo, useState } from 'react'
import { CheckCircle2, Download, ExternalLink, MessageSquareQuote, Pencil, Plus, Power, Star, Trash2 } from 'lucide-react'
import { Avatar, Button, Card, DataTable, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { useDb, removeItem, updateItem } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import TestimonialModal from './TestimonialModal'

export default function TestimonialList() {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('marketing', 'manage')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit

  const testimonials = useMemo(() => {
    const list = Array.isArray(db.testimonials) ? db.testimonials : []
    return [...list].sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999))
  }, [db.testimonials])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return testimonials.filter((t) => {
      const status = t.status || 'Active'
      const matchStatus = statusFilter === 'all' || status === statusFilter
      const matchSearch =
        !s ||
        t.name?.toLowerCase().includes(s) ||
        t.product?.toLowerCase().includes(s) ||
        (t.text || t.quote)?.toLowerCase().includes(s)
      return matchStatus && matchSearch
    })
  }, [testimonials, search, statusFilter])

  const totals = useMemo(() => {
    const active = testimonials.filter((t) => (t.status || 'Active') === 'Active').length
    const avg = testimonials.length
      ? (testimonials.reduce((s, t) => s + (Number(t.rating) || 5), 0) / testimonials.length).toFixed(1)
      : '5.0'
    return {
      total: testimonials.length,
      active,
      inactive: testimonials.length - active,
      avg,
    }
  }, [testimonials])

  const toggleStatus = (t) => {
    const current = t.status || 'Active'
    const nextStatus = current === 'Active' ? 'Inactive' : 'Active'
    updateItem('testimonials', t.id, { status: nextStatus })
    toast.success(`Testimonial from "${t.name}" marked as ${nextStatus}`)
  }

  const handleDelete = async (t) => {
    const ok = await confirm({
      title: `Delete testimonial from "${t.name}"?`,
      message: 'This testimonial will be permanently removed from the storefront and Firestore.',
      confirmText: 'Delete Testimonial',
      danger: true,
    })
    if (!ok) return
    removeItem('testimonials', t.id)
    toast.success(`Deleted testimonial from "${t.name}"`)
  }

  const onExport = () => {
    exportCSV(`reshmam-testimonials-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Customer Name', key: 'name' },
      { label: 'Rating', key: 'rating' },
      { label: 'Product', key: 'product' },
      { label: 'Review', key: 'text' },
      { label: 'Order', key: 'order' },
      { label: 'Status', key: 'status' },
    ])
    toast.success(`Exported ${filtered.length} testimonials`)
  }

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      sortable: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={t.name} src={t.avatar} size={38} />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{t.name}</p>
            {t.product && <p className="text-xs text-muted">{t.product}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (t) => {
        const stars = Math.min(5, Math.max(1, Number(t.rating) || 5))
        return (
          <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${stars} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < stars ? 'fill-current' : 'text-line'}`} />
            ))}
          </div>
        )
      },
    },
    {
      key: 'text',
      label: 'Review',
      render: (t) => (
        <div className="max-w-sm">
          <p className="line-clamp-2 text-xs text-ink">{t.text || t.quote}</p>
          {t.product && <p className="mt-0.5 text-[11px] font-medium text-primary">{t.product}</p>}
        </div>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      align: 'center',
      sortable: true,
      render: (t) => <span className="font-mono text-xs text-muted">{t.order ?? 1}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status || 'Active'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-1">
          {canManage && (
            <>
              <IconButton icon={Pencil} label={`Edit testimonial from ${t.name}`} size="sm" variant="primary" onClick={() => setEditing(t)} />
              <IconButton
                icon={Power}
                label={(t.status || 'Active') === 'Active' ? `Hide testimonial from ${t.name}` : `Show testimonial from ${t.name}`}
                size="sm"
                onClick={() => toggleStatus(t)}
              />
              <IconButton icon={Trash2} label={`Delete testimonial from ${t.name}`} size="sm" variant="danger" onClick={() => handleDelete(t)} />
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Testimonials"
        subtitle="Manage customer reviews displayed on the Homepage and Testimonials page."
        breadcrumbs={[{ label: 'Testimonials' }]}
        actions={
          <>
            <a
              href="/testimonials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition hover:bg-surface"
            >
              <ExternalLink className="h-4 w-4" />
              View Live Page
            </a>
            <Button variant="outline" icon={Download} onClick={onExport}>
              Export CSV
            </Button>
            {canManage && (
              <Button icon={Plus} onClick={() => setEditing(null)}>
                Add Testimonial
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Testimonials" value={num(totals.total)} icon={MessageSquareQuote} hint="Stored in Firestore" />
        <StatCard label="Active Reviews" value={num(totals.active)} icon={CheckCircle2} tone="green" hint="Shown on storefront" />
        <StatCard label="Hidden" value={num(totals.inactive)} icon={MessageSquareQuote} tone="gray" hint="Not visible publicly" />
        <StatCard label="Average Rating" value={`${totals.avg} ★`} icon={Star} tone="amber" hint="Out of 5 stars" />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search customer, product or review..." className="w-full md:max-w-xs" />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="All Statuses"
            options={['Active', 'Inactive']}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="No testimonials found"
            text={search ? 'Try adjusting your search or filters.' : 'Add your first customer review to show it on the storefront.'}
            action={
              canManage && !search ? (
                <Button icon={Plus} onClick={() => setEditing(null)}>
                  Add Testimonial
                </Button>
              ) : null
            }
          />
        ) : (
          <DataTable columns={columns} rows={filtered} />
        )}
      </Card>

      {editing !== undefined && <TestimonialModal testimonial={editing} onClose={() => setEditing(undefined)} />}
    </>
  )
}

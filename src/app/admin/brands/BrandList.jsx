'use client'
import { useMemo, useState } from 'react'
import { Award, Plus, Pencil, Trash2, Power, Download, Package } from 'lucide-react'
import { Button, Card, DataTable, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { useDb, removeItem, updateItem } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import BrandModal from './BrandModal'

export default function BrandList() {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('brands', 'manage')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit

  const brands = useMemo(() => {
    return (db.brands || []).map((brd) => {
      const productCount = (db.products || []).filter(
        (p) => p.brand?.toLowerCase() === brd.name?.toLowerCase()
      ).length
      return {
        ...brd,
        productCount,
      }
    })
  }, [db.brands, db.products])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return brands.filter((brd) => {
      const matchStatus = statusFilter === 'all' || brd.status === statusFilter
      const matchSearch = !s || brd.name?.toLowerCase().includes(s) || brd.slug?.toLowerCase().includes(s)
      return matchStatus && matchSearch
    })
  }, [brands, search, statusFilter])

  const totals = useMemo(() => {
    const active = brands.filter((b) => b.status === 'Active').length
    const totalProducts = brands.reduce((sum, b) => sum + b.productCount, 0)
    return {
      total: brands.length,
      active,
      inactive: brands.length - active,
      totalProducts,
    }
  }, [brands])

  const toggleStatus = async (brd) => {
    const nextStatus = brd.status === 'Active' ? 'Inactive' : 'Active'
    updateItem('brands', brd.id, { status: nextStatus })
    toast.success(`Brand "${brd.name}" marked as ${nextStatus}`)
  }

  const handleDelete = async (brd) => {
    if (brd.productCount > 0) {
      const ok = await confirm({
        title: `Delete Brand "${brd.name}"?`,
        message: `This brand has ${brd.productCount} product(s) associated with it. Are you sure you want to delete it?`,
        confirmText: 'Delete Brand',
        danger: true,
      })
      if (!ok) return
    } else {
      const ok = await confirm({
        title: `Delete Brand "${brd.name}"?`,
        message: 'This brand will be permanently removed.',
        confirmText: 'Delete Brand',
        danger: true,
      })
      if (!ok) return
    }
    removeItem('brands', brd.id)
    toast.success(`Brand "${brd.name}" deleted`)
  }

  const onExport = () => {
    exportCSV(`reshmam-brands-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Brand Name', key: 'name' },
      { label: 'Slug', key: 'slug' },
      { label: 'Description', key: 'description' },
      { label: 'Status', key: 'status' },
      { label: 'Display Order', key: 'order' },
      { label: 'Products Count', key: 'productCount' },
    ])
    toast.success(`Exported ${filtered.length} brands`)
  }

  const columns = [
    {
      key: 'name',
      label: 'Brand',
      sortable: true,
      render: (brd) => (
        <div className="flex items-center gap-3">
          {brd.logo || brd.image ? (
            <img
              src={brd.logo || brd.image}
              alt={brd.name}
              className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white p-1 ring-1 ring-line"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex'
                }
              }}
            />
          ) : null}
          <span
            style={{ display: brd.logo || brd.image ? 'none' : 'flex' }}
            className="h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary font-semibold"
          >
            <Award className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">{brd.name}</p>
            <p className="font-mono text-xs text-muted">{brd.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description / Heritage',
      render: (brd) => <p className="max-w-xs truncate text-xs text-muted">{brd.description || '—'}</p>,
    },
    {
      key: 'productCount',
      label: 'Products',
      align: 'right',
      sortable: true,
      render: (brd) => (
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          <Package className="h-3.5 w-3.5 text-muted" />
          {num(brd.productCount)}
        </span>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      align: 'center',
      sortable: true,
      render: (brd) => <span className="text-xs text-muted font-mono">{brd.order ?? 1}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (brd) => <StatusBadge status={brd.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (brd) => (
        <div className="flex justify-end gap-1">
          {canManage && (
            <>
              <IconButton icon={Pencil} label={`Edit ${brd.name}`} size="sm" variant="primary" onClick={() => setEditing(brd)} />
              <IconButton
                icon={Power}
                label={brd.status === 'Active' ? `Deactivate ${brd.name}` : `Activate ${brd.name}`}
                size="sm"
                onClick={() => toggleStatus(brd)}
              />
              <IconButton icon={Trash2} label={`Delete ${brd.name}`} size="sm" variant="danger" onClick={() => handleDelete(brd)} />
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Brands"
        subtitle="Manage brands under P. Kaliappan and Sons (Velum Mayilum, Reshmam, Mayil, Jothi)."
        breadcrumbs={[{ label: 'Brands' }]}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={onExport}>
              Export CSV
            </Button>
            {canManage && (
              <Button icon={Plus} onClick={() => setEditing(null)}>
                Add Brand
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Brands" value={num(totals.total)} icon={Award} hint="Configured in Firestore" />
        <StatCard label="Active Brands" value={num(totals.active)} icon={Award} tone="green" hint="Visible on storefront" />
        <StatCard label="Inactive" value={num(totals.inactive)} icon={Award} tone="gray" hint="Disabled from storefront" />
        <StatCard label="Branded Products" value={num(totals.totalProducts)} icon={Package} tone="blue" hint="Across all brands" />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search brands by name or slug..." className="w-full md:max-w-xs" />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="All Statuses"
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No brands found"
            text={search ? 'Try adjusting your search or filters.' : 'Get started by creating your first brand.'}
            action={
              canManage && !search ? (
                <Button icon={Plus} onClick={() => setEditing(null)}>
                  Add Brand
                </Button>
              ) : null
            }
          />
        ) : (
          <DataTable columns={columns} rows={filtered} />
        )}
      </Card>

      {editing !== undefined && (
        <BrandModal brand={editing} onClose={() => setEditing(undefined)} />
      )}
    </>
  )
}

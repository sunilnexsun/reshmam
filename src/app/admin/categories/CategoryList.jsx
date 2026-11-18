'use client'
import { useMemo, useState } from 'react'
import { FolderTree, Plus, Pencil, Trash2, Power, Download, Package } from 'lucide-react'
import { Button, Card, DataTable, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { useDb, removeItem, updateItem } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'
import CategoryModal from './CategoryModal'

export default function CategoryList() {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('categories', 'manage')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit

  const categories = useMemo(() => {
    return (db.categories || []).map((cat) => {
      const productCount = (db.products || []).filter(
        (p) => p.category?.toLowerCase() === cat.name?.toLowerCase()
      ).length
      return {
        ...cat,
        productCount,
      }
    })
  }, [db.categories, db.products])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return categories.filter((cat) => {
      const matchStatus = statusFilter === 'all' || cat.status === statusFilter
      const matchSearch = !s || cat.name?.toLowerCase().includes(s) || cat.slug?.toLowerCase().includes(s)
      return matchStatus && matchSearch
    })
  }, [categories, search, statusFilter])

  const totals = useMemo(() => {
    const active = categories.filter((c) => c.status === 'Active').length
    const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0)
    return {
      total: categories.length,
      active,
      inactive: categories.length - active,
      totalProducts,
    }
  }, [categories])

  const toggleStatus = async (cat) => {
    const nextStatus = cat.status === 'Active' ? 'Inactive' : 'Active'
    updateItem('categories', cat.id, { status: nextStatus })
    toast.success(`Category "${cat.name}" marked as ${nextStatus}`)
  }

  const handleDelete = async (cat) => {
    if (cat.productCount > 0) {
      const ok = await confirm({
        title: `Delete Category "${cat.name}"?`,
        message: `This category has ${cat.productCount} product(s) assigned to it. Are you sure you want to delete it?`,
        confirmText: 'Delete Category',
        danger: true,
      })
      if (!ok) return
    } else {
      const ok = await confirm({
        title: `Delete Category "${cat.name}"?`,
        message: 'This category will be permanently removed.',
        confirmText: 'Delete Category',
        danger: true,
      })
      if (!ok) return
    }
    removeItem('categories', cat.id)
    toast.success(`Category "${cat.name}" deleted`)
  }

  const onExport = () => {
    exportCSV(`reshmam-categories-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Category Name', key: 'name' },
      { label: 'Slug', key: 'slug' },
      { label: 'Description', key: 'description' },
      { label: 'Status', key: 'status' },
      { label: 'Display Order', key: 'order' },
      { label: 'Products Count', key: 'productCount' },
    ])
    toast.success(`Exported ${filtered.length} categories`)
  }

  const columns = [
    {
      key: 'name',
      label: 'Category',
      sortable: true,
      render: (cat) => (
        <div className="flex items-center gap-3">
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-line"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex'
                }
              }}
            />
          ) : null}
          <span
            style={{ display: cat.image ? 'none' : 'flex' }}
            className="h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary font-semibold"
          >
            <FolderTree className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">{cat.name}</p>
            <p className="font-mono text-xs text-muted">{cat.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (cat) => <p className="max-w-xs truncate text-xs text-muted">{cat.description || '—'}</p>,
    },
    {
      key: 'productCount',
      label: 'Products',
      align: 'right',
      sortable: true,
      render: (cat) => (
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          <Package className="h-3.5 w-3.5 text-muted" />
          {num(cat.productCount)}
        </span>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      align: 'center',
      sortable: true,
      render: (cat) => <span className="text-xs text-muted font-mono">{cat.order ?? 1}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (cat) => <StatusBadge status={cat.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (cat) => (
        <div className="flex justify-end gap-1">
          {canManage && (
            <>
              <IconButton icon={Pencil} label={`Edit ${cat.name}`} size="sm" variant="primary" onClick={() => setEditing(cat)} />
              <IconButton
                icon={Power}
                label={cat.status === 'Active' ? `Deactivate ${cat.name}` : `Activate ${cat.name}`}
                size="sm"
                onClick={() => toggleStatus(cat)}
              />
              <IconButton icon={Trash2} label={`Delete ${cat.name}`} size="sm" variant="danger" onClick={() => handleDelete(cat)} />
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Organize oils, combos, and cattle feed for the store."
        breadcrumbs={[{ label: 'Categories' }]}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={onExport}>
              Export CSV
            </Button>
            {canManage && (
              <Button icon={Plus} onClick={() => setEditing(null)}>
                Add Category
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Categories" value={num(totals.total)} icon={FolderTree} hint="Configured in Firestore" />
        <StatCard label="Active Categories" value={num(totals.active)} icon={FolderTree} tone="green" hint="Visible on storefront" />
        <StatCard label="Inactive" value={num(totals.inactive)} icon={FolderTree} tone="gray" hint="Hidden from navigation" />
        <StatCard label="Categorized Products" value={num(totals.totalProducts)} icon={Package} tone="blue" hint="Across all categories" />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search categories by name or slug..." className="w-full md:max-w-xs" />
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
            icon={FolderTree}
            title="No categories found"
            text={search ? 'Try adjusting your search or filters.' : 'Get started by creating your first product category.'}
            action={
              canManage && !search ? (
                <Button icon={Plus} onClick={() => setEditing(null)}>
                  Add Category
                </Button>
              ) : null
            }
          />
        ) : (
          <DataTable columns={columns} rows={filtered} />
        )}
      </Card>

      {editing !== undefined && (
        <CategoryModal category={editing} onClose={() => setEditing(undefined)} />
      )}
    </>
  )
}

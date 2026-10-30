import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Download, Eye, Package, PackageCheck, PackageX, Pencil, Plus, Power, PowerOff, Star, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, DataTable, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, Thumb, Toggle, useConfirm, useToast } from '../../components/ui'
import { useDb } from '../../services/store'
import { deleteProducts, setProductsStatus } from '../../services/productActions'
import { productRows } from '../../services/selectors'
import { useAuth } from '../../services/auth'
import { CATEGORIES } from '../../data/seed'
import { inr, num } from '../../utils/format'
import { exportCSV } from '../../utils/export'
import { priceRange } from './productUtils'

const STOCK_FILTERS = ['In Stock', 'Low Stock', 'Out of Stock']

export default function ProductList() {
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('products', 'manage')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || 'all'
  const branch = params.get('branch') || 'all'
  const status = params.get('status') || 'all'
  const stock = params.get('stock') || 'all'
  const setParam = (k, v) => setParams((p) => { if (v && v !== 'all') p.set(k, v); else p.delete(k); return p }, { replace: true })
  const clearFilters = () => setParams((p) => { ['q', 'category', 'branch', 'status', 'stock'].forEach((k) => p.delete(k)); return p }, { replace: true })
  const [selected, setSelected] = useState([])

  // When a branch is chosen, price/stock columns reflect that branch only.
  const rows = useMemo(() => {
    if (branch === 'all') return productRows(db)
    return productRows({ ...db, variants: db.variants.filter((v) => v.branchId === branch) }).filter((r) => r.variants.length)
  }, [db, branch])
  const allRows = useMemo(() => (branch === 'all' ? rows : productRows(db)), [db, rows, branch])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((p) => (category === 'all' || p.category === category) && (status === 'all' || p.status === status) &&
      (stock === 'all' || p.stockStatus === stock) &&
      (!s || `${p.name} ${p.sku} ${p.brand} ${p.variants.map((v) => v.sku).join(' ')}`.toLowerCase().includes(s)))
  }, [rows, q, category, status, stock])
  const filtersOn = q || category !== 'all' || branch !== 'all' || status !== 'all' || stock !== 'all'

  const summary = useMemo(() => ({
    total: allRows.length,
    active: allRows.filter((p) => p.status === 'Active').length,
    low: allRows.filter((p) => p.stockStatus === 'Low Stock').length,
    out: allRows.filter((p) => p.stockStatus === 'Out of Stock').length,
  }), [allRows])

  // Keep the selection limited to rows that still exist.
  const visibleSelected = selected.filter((id) => db.products.some((p) => p.id === id))

  const onToggleStatus = (p, on) => {
    setProductsStatus([p.id], on ? 'Active' : 'Inactive')
    toast.success(`${p.name} ${on ? 'activated' : 'deactivated'}`)
  }
  const onDelete = async (p) => {
    const ok = await confirm({ title: 'Delete product?', message: `Delete "${p.name}" and its ${p.variants.length} price/stock variant${p.variants.length === 1 ? '' : 's'}? Past orders and stock history are kept. This cannot be undone.`, confirmText: 'Delete Product' })
    if (!ok) return
    deleteProducts([p.id])
    setSelected((s) => s.filter((x) => x !== p.id))
    toast.success('Product deleted')
  }
  const bulkStatus = (st) => {
    const n = setProductsStatus(visibleSelected, st)
    toast.success(`${n} product${n === 1 ? '' : 's'} marked ${st}`)
    setSelected([])
  }
  const bulkDelete = async () => {
    const ok = await confirm({ title: `Delete ${visibleSelected.length} products?`, message: 'The selected products and all their branch variants will be removed. Past orders and stock history are kept. This cannot be undone.', confirmText: 'Delete All' })
    if (!ok) return
    const n = deleteProducts(visibleSelected)
    setSelected([])
    toast.success(`${n} product${n === 1 ? '' : 's'} deleted`)
  }
  const onExport = () => {
    exportCSV(`reshmam-products-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Name', key: 'name' }, { label: 'SKU', key: 'sku' }, { label: 'Category', key: 'category' }, { label: 'Brand', key: 'brand' },
      { label: 'HSN', key: 'hsn' }, { label: 'GST %', key: 'gst' },
      { label: 'Min Price (INR)', key: 'minPrice' }, { label: 'Max Price (INR)', key: 'maxPrice' }, { label: 'Min MRP (INR)', key: 'minMrp' },
      { label: 'Variants', value: (p) => p.variants.map((v) => `${v.size} @ ${db.branches.find((b) => b.id === v.branchId)?.code || ''}: ${v.price}/${v.mrp} (${v.stock})`).join('; ') },
      { label: 'Total Stock', key: 'stock' }, { label: 'Stock Status', key: 'stockStatus' },
      { label: 'Branches', value: (p) => p.branchNames.join('; ') }, { label: 'Status', key: 'status' }, { label: 'Featured', value: (p) => (p.featured ? 'Yes' : 'No') },
    ])
    toast.success(`Exported ${filtered.length} products`)
  }

  const columns = [
    { key: 'name', label: 'Product', sortable: true, render: (p) => (
      <div className="flex min-w-[200px] items-center gap-3">
        <Thumb src={p.image} alt={p.name} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <span className="truncate">{p.name}</span>
            {p.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />}
          </p>
          <p className="truncate text-xs text-muted">{p.sku} · {p.brand}</p>
        </div>
      </div>
    ) },
    { key: 'category', label: 'Category', sortable: true, render: (p) => <span className="whitespace-nowrap">{p.category}</span> },
    { key: 'minPrice', label: 'Price', sortable: true, align: 'right', render: (p) => (
      <div className="whitespace-nowrap"><p className="font-medium">{p.variants.length ? priceRange(p.minPrice, p.maxPrice) : '—'}</p><p className="text-xs text-muted">{p.variants.length} variant{p.variants.length === 1 ? '' : 's'}</p></div>
    ) },
    { key: 'minMrp', label: 'MRP', sortable: true, align: 'right', render: (p) => <span className="whitespace-nowrap text-muted">{p.variants.length ? (p.minMrp === Math.max(...p.variants.map((v) => v.mrp)) ? inr(p.minMrp) : `from ${inr(p.minMrp)}`) : '—'}</span> },
    { key: 'stock', label: 'Stock', sortable: true, align: 'right', render: (p) => (
      <div className="flex flex-col items-end gap-1"><span className="font-medium">{num(p.stock)}</span><StatusBadge status={p.stockStatus} /></div>
    ) },
    { key: 'branch', label: 'Branch', sortValue: (p) => p.branchNames.join(), sortable: true, render: (p) => (
      <div className="flex flex-col gap-0.5 text-xs">{p.branchNames.length ? p.branchNames.map((b) => <span key={b} title={b} className="whitespace-nowrap">{b.split(' – ')[0]}</span>) : <span className="text-muted">No branch</span>}</div>
    ) },
    { key: 'status', label: 'Status', sortable: true, render: (p) => canManage
      ? <div className="flex items-center gap-2"><Toggle size="sm" className="relative [&_label]:sr-only" checked={p.status === 'Active'} onChange={(on) => onToggleStatus(p, on)} label={`${p.name} active`} /><span className="text-xs text-muted">{p.status}</span></div>
      : <StatusBadge status={p.status} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: (p) => (
      <div className="flex justify-end gap-1">
        <IconButton icon={Eye} label={`View ${p.name}`} size="sm" onClick={() => navigate(`/products/${p.id}`)} />
        {canManage && <IconButton icon={Pencil} label={`Edit ${p.name}`} size="sm" variant="primary" onClick={() => navigate(`/products/${p.id}/edit`)} />}
        {canManage && <IconButton icon={Trash2} label={`Delete ${p.name}`} size="sm" variant="danger" onClick={() => onDelete(p)} />}
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Products" subtitle="Catalogue, branch-wise prices and stock at a glance." breadcrumbs={[{ label: 'Products' }]}
        actions={<>
          <Button variant="outline" icon={Download} onClick={onExport} disabled={!filtered.length}>Export CSV</Button>
          {canManage && <Button icon={Plus} as="link" to="/products/new">Add Product</Button>}
        </>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={num(summary.total)} icon={Package} hint={`${db.variants.length} branch variants`} onClick={clearFilters} />
        <StatCard label="Active Products" value={num(summary.active)} icon={PackageCheck} tone="blue" hint={`${summary.total - summary.active} inactive`} onClick={() => setParam('status', 'Active')} />
        <StatCard label="Low Stock" value={num(summary.low)} icon={AlertTriangle} tone="amber" hint="At or below alert level in a branch" onClick={() => setParam('stock', 'Low Stock')} />
        <StatCard label="Out of Stock" value={num(summary.out)} icon={PackageX} tone="red" hint="No stock in any branch" onClick={() => setParam('stock', 'Out of Stock')} />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search product name or SKU" className="lg:w-72" />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:ml-auto">
            <FilterSelect label="Category" value={category} onChange={(v) => setParam('category', v)} allLabel="All Categories" options={CATEGORIES} className="w-full sm:w-auto" />
            <FilterSelect label="Branch" value={branch} onChange={(v) => setParam('branch', v)} allLabel="All Branches" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} className="w-full sm:w-auto" />
            <FilterSelect label="Status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={['Active', 'Inactive']} className="w-full sm:w-auto" />
            <FilterSelect label="Stock status" value={stock} onChange={(v) => setParam('stock', v)} allLabel="All Stock" options={STOCK_FILTERS} className="w-full sm:w-auto" />
            {filtersOn && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters} className="h-9">Clear</Button>}
          </div>
        </div>

        {canManage && visibleSelected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
            <Badge tone="primary">{visibleSelected.length} selected</Badge>
            <Button size="sm" variant="outline" icon={Power} onClick={() => bulkStatus('Active')}>Activate</Button>
            <Button size="sm" variant="outline" icon={PowerOff} onClick={() => bulkStatus('Inactive')}>Deactivate</Button>
            <Button size="sm" variant="danger-outline" icon={Trash2} onClick={bulkDelete}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])} className="sm:ml-auto">Clear selection</Button>
          </div>
        )}

        <DataTable columns={columns} rows={filtered} onRowClick={(p) => navigate(`/products/${p.id}`)} initialSort={{ key: 'name', dir: 'asc' }}
          selectable={canManage} selected={visibleSelected} onSelect={setSelected}
          empty={<EmptyState icon={Package} title={filtersOn ? 'No products match these filters' : 'No products yet'} text={filtersOn ? 'Try a different search term or clear the filters.' : 'Add your first product to start selling.'}
            action={filtersOn ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : canManage && <Button icon={Plus} as="link" to="/products/new">Add Product</Button>} />} />
      </Card>
    </>
  )
}

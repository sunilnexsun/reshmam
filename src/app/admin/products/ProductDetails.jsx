'use client'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@admin/_lib/navigation'
import { AlertTriangle, Boxes, Building2, History, IndianRupee, Layers, Pencil, ShoppingBag, Star, Tags, Trash2 } from 'lucide-react'
import { Badge, Button, Card, DataTable, EmptyState, InfoList, PageHeader, StatCard, StatusBadge, Tabs, Toggle, useConfirm, useToast } from '@admin/_components/ui'
import { useDb } from '@admin/_lib/store'
import { deleteProducts, setProductFeatured, setProductsStatus } from '@admin/_lib/productActions'
import { byId, stockStatus } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { cn, date, dateTime, inr, num } from '@admin/_lib/format'
import NotFound from '@admin/_components/NotFound'
import { discountPct } from './productUtils'
import PriceChange from './PriceChange'

const signed = (n) => (n > 0 ? `+${num(n)}` : num(n))

export default function ProductDetails() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('products', 'manage')
  const canPrices = can('prices')
  const product = db.products.find((p) => p.id === id)
  const [active, setActive] = useState(product?.primaryImage || 0)
  const [tab, setTab] = useState('stock')

  const branches = useMemo(() => byId(db.branches), [db.branches])
  const variants = useMemo(() => db.variants.filter((v) => v.productId === id)
    .sort((a, b) => (branches[a.branchId]?.name || '').localeCompare(branches[b.branchId]?.name || '') || a.price - b.price), [db.variants, id, branches])
  const variantById = useMemo(() => byId(variants), [variants])
  const moves = useMemo(() => db.stockMovements.filter((m) => m.productId === id).sort((a, b) => (a.date < b.date ? 1 : -1)), [db.stockMovements, id])
  const prices = useMemo(() => db.priceHistory.filter((h) => h.productId === id).sort((a, b) => (a.date < b.date ? 1 : -1)), [db.priceHistory, id])
  const orders = useMemo(() => db.orders.filter((o) => o.items.some((it) => it.productId === id)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [db.orders, id])

  if (!product) return <NotFound title="Product not found" text="It may have been deleted." back="/products" backLabel="Back to Products" />

  const images = product.images?.length ? product.images : []
  const shown = images[Math.min(active, images.length - 1)] ?? images[product.primaryImage || 0]
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  const lowCount = variants.filter((v) => v.stock > 0 && v.stock <= v.alertStock).length
  const outCount = variants.filter((v) => v.stock <= 0).length
  const stockValue = variants.reduce((s, v) => s + v.stock * v.price, 0)
  const unitsSold = orders.filter((o) => !['Cancelled', 'Returned'].includes(o.status)).reduce((s, o) => s + o.items.filter((it) => it.productId === id).reduce((a, it) => a + it.qty, 0), 0)
  const priceList = variants.filter((v) => v.status === 'Active').map((v) => v.price)

  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete product?', message: `Delete "${product.name}" and its ${variants.length} branch variant${variants.length === 1 ? '' : 's'}? Orders and stock history are kept. This cannot be undone.`, confirmText: 'Delete Product' }))) return
    deleteProducts([product.id])
    toast.success('Product deleted')
    navigate('/products')
  }
  const onStatus = (on) => { setProductsStatus([product.id], on ? 'Active' : 'Inactive'); toast.success(`Product ${on ? 'activated' : 'deactivated'}`) }
  const onFeatured = (on) => { setProductFeatured(product.id, on); toast.success(on ? 'Marked as featured' : 'Removed from featured') }

  const variantLabel = (vid, fallbackSize, branchId) => {
    const v = variantById[vid]
    return `${v?.size || fallbackSize || '—'} · ${branches[v?.branchId || branchId]?.name || 'Removed branch'}`
  }

  const priceColumns = [
    { key: 'branch', label: 'Branch', sortable: true, sortValue: (v) => branches[v.branchId]?.name, render: (v) => <span className="block min-w-[120px] font-medium">{branches[v.branchId]?.name || '—'}</span> },
    { key: 'size', label: 'Size', render: (v) => <div className="whitespace-nowrap"><p>{v.size} <span className="text-xs text-muted">· {v.unitType}</span></p><p className="font-mono text-[11px] text-muted">{v.sku}</p></div> },
    { key: 'price', label: 'Price', sortable: true, align: 'right', render: (v) => <b>{inr(v.price)}</b> },
    { key: 'mrp', label: 'MRP', sortable: true, align: 'right', render: (v) => <span className="text-muted">{inr(v.mrp)}</span> },
    { key: 'disc', label: 'Discount', align: 'right', sortable: true, sortValue: (v) => discountPct(v.price, v.mrp), render: (v) => discountPct(v.price, v.mrp) ? <Badge tone="green">{discountPct(v.price, v.mrp)}%</Badge> : <span className="text-muted">—</span> },
    { key: 'stock', label: 'Stock', sortable: true, align: 'right', render: (v) => <div className="flex flex-col items-end gap-1"><span className="font-medium">{num(v.stock)}</span><StatusBadge status={stockStatus(v.stock, v.alertStock)} /></div> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v.status} /> },
  ]
  const moveColumns = [
    { key: 'date', label: 'Date', sortable: true, render: (m) => <span className="whitespace-nowrap">{dateTime(m.date)}</span> },
    { key: 'variant', label: 'Variant', render: (m) => <span className="whitespace-nowrap">{variantLabel(m.variantId, '', m.branchId)}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (m) => <Badge tone={m.qty >= 0 ? 'green' : 'red'}>{m.type}</Badge> },
    { key: 'qty', label: 'Qty', sortable: true, align: 'right', render: (m) => <span className={cn('font-semibold', m.qty >= 0 ? 'text-accent' : 'text-red-600')}>{signed(m.qty)}</span> },
    { key: 'balance', label: 'Balance', align: 'right', render: (m) => num(m.balance) },
    { key: 'reference', label: 'Reference / Notes', render: (m) => <div className="min-w-[160px] text-xs"><p className="font-medium text-ink">{m.reference || '—'}</p>{m.notes && <p className="text-muted">{m.notes}</p>}</div> },
    { key: 'user', label: 'By', render: (m) => <span className="whitespace-nowrap">{m.user}</span> },
  ]
  const priceHistColumns = [
    { key: 'date', label: 'Date', sortable: true, render: (h) => <span className="whitespace-nowrap">{dateTime(h.date)}</span> },
    { key: 'variant', label: 'Variant', render: (h) => <span className="whitespace-nowrap">{variantLabel(h.variantId, h.size, h.branchId)}</span> },
    { key: 'price', label: 'Price', render: (h) => <PriceChange from={h.oldPrice} to={h.newPrice} /> },
    { key: 'mrp', label: 'MRP', render: (h) => <PriceChange from={h.oldMrp} to={h.newMrp} /> },
    { key: 'note', label: 'Note', render: (h) => <span className="text-muted">{h.note || '—'}</span> },
    { key: 'user', label: 'By', render: (h) => <span className="whitespace-nowrap">{h.user}</span> },
  ]
  const orderColumns = [
    { key: 'number', label: 'Order', sortable: true, render: (o) => <span className="font-medium text-primary">{o.number}</span> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (o) => <span className="whitespace-nowrap">{date(o.createdAt)}</span> },
    { key: 'customerName', label: 'Customer', render: (o) => <span className="whitespace-nowrap">{o.customerName}</span> },
    { key: 'items', label: 'This product', render: (o) => <span className="whitespace-nowrap text-muted">{o.items.filter((it) => it.productId === id).map((it) => `${it.size} × ${it.qty}`).join(', ')}</span> },
    { key: 'total', label: 'Order Total', sortable: true, align: 'right', render: (o) => <b>{inr(o.total)}</b> },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
  ]

  return (
    <>
      <PageHeader title={product.name} subtitle={`${product.sku} · ${product.brand}`}
        breadcrumbs={[{ label: 'Products', to: '/products' }, { label: product.name }]}
        actions={<>
          {canPrices && <Button variant="outline" icon={Tags} as="link" to={`/price-management?product=${product.id}${variants[0] ? `&branch=${variants[0].branchId}` : ''}`}>Manage Prices</Button>}
          {canManage && <Button variant="primary" icon={Pencil} as="link" to={`/products/${product.id}/edit`}>Edit Product</Button>}
          {canManage && <Button variant="danger-outline" icon={Trash2} onClick={onDelete}>Delete</Button>}
        </>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="min-w-0 space-y-6">
          <Card bodyClassName="p-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
              {shown ? <img src={shown} alt={product.name} className="h-full w-full object-contain p-4" /> : <EmptyState title="No image" text={canManage ? 'Add images from Edit Product.' : undefined} />}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scroll-thin" role="tablist" aria-label="Product images">
                {images.map((src, i) => (
                  <button key={i} type="button" role="tab" aria-selected={src === shown} aria-label={`Show image ${i + 1}`} onClick={() => setActive(i)}
                    className={cn('relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-surface transition', src === shown ? 'border-accent' : 'border-line hover:border-accent/50')}>
                    <img src={src} alt="" className="h-full w-full object-contain" />
                    {i === (product.primaryImage || 0) && <span className="absolute inset-x-0 bottom-0 bg-accent/90 text-[9px] font-semibold text-white">Primary</span>}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Product Information">
            <div className="mb-4 flex flex-wrap gap-1.5">
              <StatusBadge status={product.status} />
              <Badge tone="primary">{product.category}</Badge>
              {product.featured && <Badge tone="amber"><Star className="h-3 w-3 fill-current" />Featured</Badge>}
            </div>
            {product.description && <p className="mb-4 text-sm leading-relaxed text-ink">{product.description}</p>}
            <InfoList items={[
              ['SKU', <span key="s" className="font-mono">{product.sku}</span>],
              ['Category', product.category], ['Brand', product.brand], ['Unit type', product.unitType],
              ['HSN code', product.hsn || '—'], ['GST', `${product.gst ?? 0}%`],
              ['Price range', priceList.length ? (Math.min(...priceList) === Math.max(...priceList) ? inr(priceList[0]) : `${inr(Math.min(...priceList))} – ${inr(Math.max(...priceList))}`) : '—'],
              ['Created', date(product.createdAt)], ['Last updated', dateTime(product.updatedAt)],
            ]} />
            {canManage && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <Toggle checked={product.status === 'Active'} onChange={onStatus} label="Active on store" description="Inactive products are hidden from customers" />
                <Toggle checked={!!product.featured} onChange={onFeatured} label="Featured" description="Show in the featured section" />
              </div>
            )}
          </Card>

          <Card title="Branch Availability" subtitle={`${new Set(variants.map((v) => v.branchId)).size} of ${db.branches.length} branches`}>
            <ul className="space-y-3">
              {db.branches.map((b) => {
                const vs = variants.filter((v) => v.branchId === b.id)
                const st = vs.reduce((s, v) => s + v.stock, 0)
                return (
                  <li key={b.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', vs.length ? 'bg-accent-soft text-primary' : 'bg-surface text-muted')}><Building2 className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{b.name}</p>
                      <p className="text-xs text-muted">{vs.length ? vs.map((v) => v.size).join(' · ') : 'Not sold in this branch'}</p>
                    </div>
                    {vs.length ? <div className="text-right"><p className="text-sm font-semibold">{num(st)}</p><p className="text-[11px] text-muted">in stock</p></div> : <Badge>Unavailable</Badge>}
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Total Stock" value={num(totalStock)} icon={Boxes} hint={`Across ${variants.length} variant${variants.length === 1 ? '' : 's'}`} />
            <StatCard label="Stock Value" value={inr(stockValue)} icon={IndianRupee} tone="blue" hint="At current selling prices" />
            <StatCard label="Low / Out of Stock" value={`${lowCount} / ${outCount}`} icon={AlertTriangle} tone={outCount ? 'red' : 'amber'} hint="Variants needing restock" />
            <StatCard label="Units Sold" value={num(unitsSold)} icon={ShoppingBag} tone="purple" hint={`In ${orders.length} order${orders.length === 1 ? '' : 's'}, excl. cancelled/returned`} />
          </div>

          <Card title="Pricing by Branch & Size" subtitle="Selling price, MRP and stock for every variant." bodyClassName="p-0"
            actions={canPrices && variants.length > 0 && <Button size="sm" variant="outline" icon={Tags} as="link" to={`/price-management?product=${product.id}&branch=${variants[0].branchId}`}>Edit Prices</Button>}>
            <DataTable columns={priceColumns} rows={variants} pageSize={10}
              empty={<EmptyState icon={Layers} title="No prices yet" text="Add a size and price for at least one branch." action={canManage && <Button as="link" to={`/products/${product.id}/edit`} icon={Pencil}>Add Variant</Button>} />} />
          </Card>

          <Card bodyClassName="p-0">
            <div className="px-4 pt-2">
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'stock', label: 'Stock History', icon: Boxes, count: moves.length },
                { value: 'price', label: 'Price History', icon: History, count: prices.length },
                { value: 'orders', label: 'Recent Orders', icon: ShoppingBag, count: orders.length },
              ]} />
            </div>
            {tab === 'stock' && <DataTable columns={moveColumns} rows={moves} pageSize={10} empty={<EmptyState icon={Boxes} title="No stock movements yet" />} />}
            {tab === 'price' && <DataTable columns={priceHistColumns} rows={prices} pageSize={10} empty={<EmptyState icon={History} title="No price changes yet" text="Changes made in Price Management or the product form appear here." />} />}
            {tab === 'orders' && <DataTable columns={orderColumns} rows={orders} pageSize={10} onRowClick={(o) => navigate(`/orders/${o.id}`)} empty={<EmptyState icon={ShoppingBag} title="No orders yet" text="Orders containing this product will appear here." />} />}
          </Card>
        </div>
      </div>
    </>
  )
}

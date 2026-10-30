import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Boxes, ExternalLink, IndianRupee, Mail, MapPin, Package, Pencil, Phone, Power, ShoppingBag, Tags, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Card, DataTable, EmptyState, InfoList, PageHeader, StatCard, StatusBadge, Thumb } from '../../components/ui'
import { AXIS, CHART_COLORS, ChartTooltip, GRID, moneyAxis } from '../../components/charts'
import { useDb } from '../../services/store'
import { byId, salesSeries, stockStatus } from '../../services/selectors'
import { useAuth } from '../../services/auth'
import { growth } from '../../utils/dateRange'
import { cn, date, inr, num } from '../../utils/format'
import NotFound from '../NotFound'
import BranchFormModal from './BranchFormModal'
import { branchStats, fullAddress } from './branchData'
import { useBranchActions } from './useBranchActions'

const priceLink = (branchId, productId) => `/price-management?branch=${branchId}&product=${productId}`

export default function BranchDetails() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const { can } = useAuth()
  const canManage = can('branches', 'manage')
  const { toggleStatus, remove } = useBranchActions()
  const [editOpen, setEditOpen] = useState(false)
  const branch = db.branches.find((b) => b.id === id)

  const products = useMemo(() => byId(db.products), [db.products])
  const stats = useMemo(() => branchStats(db)[id], [db, id])
  const variants = useMemo(() => db.variants.filter((v) => v.branchId === id).map((v) => {
    const p = products[v.productId] || {}
    return { ...v, productName: p.name || 'Unknown product', image: p.images?.[p.primaryImage || 0], category: p.category, stockStatus: stockStatus(v.stock, v.alertStock) }
  }), [db.variants, id, products])
  const lowItems = useMemo(() => variants.filter((v) => v.status === 'Active' && v.stock <= v.alertStock).sort((a, b) => a.stock - b.stock), [variants])
  const orders = useMemo(() => db.orders.filter((o) => o.branchId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [db.orders, id])
  const series = useMemo(() => {
    const now = new Date()
    return salesSeries(orders, { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: now }, 'month')
  }, [orders])
  const others = useMemo(() => db.branches.filter((b) => b.id !== id), [db.branches, id])
  const comparison = useMemo(() => variants.map((v) => {
    const peers = Object.fromEntries(others.map((b) => [b.id, db.variants.find((x) => x.branchId === b.id && x.productId === v.productId && x.size === v.size)]))
    const peerPrices = Object.values(peers).filter(Boolean).map((x) => x.price)
    const lowest = peerPrices.length ? Math.min(...peerPrices) : null
    return { ...v, peers, peerCount: peerPrices.length, diff: lowest == null ? null : v.price - lowest }
  }).sort((a, b) => b.peerCount - a.peerCount || a.productName.localeCompare(b.productName)), [variants, others, db.variants])

  if (!branch) return <NotFound title="Branch not found" back="/branches" backLabel="Back to Branches" />

  const sixMonthRevenue = series.reduce((s, x) => s + x.revenue, 0)
  const onDelete = async () => { if (await remove(branch)) navigate('/branches') }

  const productCols = [
    { key: 'productName', label: 'Product', sortable: true, render: (v) => (
      <div className="flex min-w-[220px] items-center gap-3"><Thumb src={v.image} size={36} /><div className="min-w-0"><Link to={`/products/${v.productId}`} className="font-medium text-ink hover:text-primary">{v.productName}</Link><p className="text-xs text-muted">{v.sku}</p></div></div>
    ) },
    { key: 'size', label: 'Size', sortable: true, className: 'whitespace-nowrap' },
    { key: 'price', label: 'Price', sortable: true, align: 'right', render: (v) => <b>{inr(v.price)}</b> },
    { key: 'mrp', label: 'MRP', sortable: true, align: 'right', render: (v) => <span className="text-muted">{inr(v.mrp)}</span> },
    { key: 'stock', label: 'Stock', sortable: true, align: 'right', render: (v) => <span className={cn('font-medium', v.stock <= 0 ? 'text-red-600' : v.stock <= v.alertStock && 'text-amber-700')}>{num(v.stock)}</span> },
    { key: 'stockStatus', label: 'Availability', render: (v) => <StatusBadge status={v.status === 'Active' ? v.stockStatus : 'Inactive'} /> },
    { key: 'actions', label: 'Pricing', align: 'right', render: (v) => <Button size="sm" variant="ghost" icon={Tags} as="link" to={priceLink(id, v.productId)} aria-label={`Manage price of ${v.productName} ${v.size}`}>Manage</Button> },
  ]
  const orderCols = [
    { key: 'number', label: 'Order', render: (o) => <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link> },
    { key: 'customerName', label: 'Customer', render: (o) => <span className="whitespace-nowrap">{o.customerName}</span> },
    { key: 'createdAt', label: 'Date', render: (o) => <span className="whitespace-nowrap">{date(o.createdAt)}</span> },
    { key: 'total', label: 'Total', align: 'right', render: (o) => <b>{inr(o.total)}</b> },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
  ]
  const compareCols = [
    { key: 'productName', label: 'Product', sortable: true, render: (v) => <span className="inline-block min-w-[200px] font-medium">{v.productName} <span className="whitespace-nowrap text-muted">· {v.size}</span></span> },
    { key: 'price', label: 'This branch', align: 'right', render: (v) => <b>{inr(v.price)}</b> },
    ...others.map((b) => ({ key: b.id, label: b.code, align: 'right', render: (v) => {
      const p = v.peers[b.id]
      if (!p) return <span className="text-muted" title="Not sold in this branch">—</span>
      const d = v.price - p.price
      return <span className="whitespace-nowrap">{inr(p.price)}{d !== 0 && <span className={cn('ml-1 text-[11px]', d > 0 ? 'text-amber-700' : 'text-accent')}>({d > 0 ? 'you +' : 'you −'}{inr(Math.abs(d))})</span>}</span>
    } })),
    { key: 'diff', label: 'vs lowest', align: 'right', sortable: true, sortValue: (v) => v.diff ?? -1e9, render: (v) => v.diff == null ? <Badge>Only here</Badge> : v.diff === 0 ? <Badge tone="green">Lowest</Badge> : v.diff > 0 ? <Badge tone="amber">+{inr(v.diff)}</Badge> : <Badge tone="green">−{inr(-v.diff)}</Badge> },
    { key: 'go', label: '', align: 'right', render: (v) => <Link to={priceLink(id, v.productId)} aria-label={`Edit prices for ${v.productName}`} className="inline-flex text-muted hover:text-primary"><ExternalLink className="h-4 w-4" /></Link> },
  ]

  return (
    <>
      <PageHeader title={branch.name} subtitle={`Branch code ${branch.code}`} breadcrumbs={[{ label: 'Branches', to: '/branches' }, { label: branch.name }]}
        actions={<>
          <Button variant="outline" icon={Tags} as="link" to={`/price-management?branch=${id}`}>Price Management</Button>
          {canManage && <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>}
          {canManage && <Button variant="outline" icon={Power} onClick={() => toggleStatus(branch)}>{branch.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>}
          {canManage && <Button variant="danger-outline" icon={Trash2} onClick={onDelete}>Delete</Button>}
        </>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue This Month" value={inr(stats.monthRevenue)} change={growth(stats.monthRevenue, stats.lastMonthRevenue)} changeLabel="vs last month" icon={IndianRupee} />
        <StatCard label="Orders This Month" value={num(stats.monthOrders)} icon={ShoppingBag} tone="blue" hint={`${num(stats.orders)} orders all time`} />
        <StatCard label="Products Available" value={num(stats.products)} icon={Package} tone="purple" hint={`${stats.variants} size variants`} />
        <StatCard label="Stock Units" value={num(stats.stock)} icon={Boxes} tone="amber" hint={`Stock value ${inr(stats.stockValue)}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card title="Branch Information" actions={<StatusBadge status={branch.status} />}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><span>{fullAddress(branch)}</span></li>
              <li className="flex items-center gap-3"><Phone className="h-4 w-4 shrink-0 text-muted" /><a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="hover:text-primary">{branch.phone}</a></li>
              <li className="flex min-w-0 items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-muted" /><a href={`mailto:${branch.email}`} className="truncate hover:text-primary">{branch.email}</a></li>
              <li className="flex items-center gap-3"><UserRound className="h-4 w-4 shrink-0 text-muted" />{branch.manager || '—'}</li>
            </ul>
            <InfoList className="mt-4 border-t border-line pt-1" items={[['Branch code', <span key="c" className="font-mono">{branch.code}</span>], ['Created', date(branch.createdAt)], ['Last updated', date(branch.updatedAt || branch.createdAt)], ['Revenue (all time)', inr(stats.totalRevenue)]]} />
          </Card>

          <Card title="Inventory Summary" actions={<Button size="sm" variant="ghost" as="link" to={`/inventory?branch=${id}`}>Open inventory</Button>}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface p-3"><p className="text-xs text-muted">Stock units</p><p className="mt-0.5 text-lg font-semibold">{num(stats.stock)}</p></div>
              <div className="rounded-lg bg-surface p-3"><p className="text-xs text-muted">Stock value</p><p className="mt-0.5 truncate text-lg font-semibold">{inr(stats.stockValue)}</p></div>
              <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-800">Low stock</p><p className="mt-0.5 text-lg font-semibold text-amber-800">{stats.lowStock}</p></div>
              <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">Out of stock</p><p className="mt-0.5 text-lg font-semibold text-red-700">{stats.outOfStock}</p></div>
            </div>
            <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-[13px] font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" />Needs restocking</h3>
            {lowItems.length ? (
              <ul className="divide-y divide-line">
                {lowItems.slice(0, 6).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2">
                    <Thumb src={v.image} size={32} />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{v.productName}</p><p className="text-xs text-muted">{v.size} · alert at {v.alertStock}</p></div>
                    <Badge tone={v.stock <= 0 ? 'red' : 'amber'}>{v.stock <= 0 ? 'Out' : `${v.stock} left`}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">All items are above their alert level.</p>}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Sales Performance" subtitle={`Revenue, last 6 months · ${inr(sixMonthRevenue)} total`}>
            {sixMonthRevenue > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="label" {...AXIS} />
                  <YAxis {...AXIS} tickFormatter={moneyAxis} width={56} />
                  <Tooltip cursor={{ fill: 'rgba(6,78,59,0.06)' }} content={<ChartTooltip money />} />
                  <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={ShoppingBag} title="No sales yet" text="Revenue will appear here once this branch receives orders." />}
          </Card>

          <Card title="Products Available" subtitle={`${variants.length} variants stocked in this branch`} bodyClassName="p-0"
            actions={<Button size="sm" variant="outline" icon={Tags} as="link" to={`/price-management?branch=${id}`}>Edit prices</Button>}>
            <DataTable columns={productCols} rows={variants} pageSize={10} initialSort={{ key: 'productName', dir: 'asc' }}
              empty={<EmptyState icon={Package} title="No products in this branch" text="Add a branch variant from a product page or transfer stock from another branch." />} />
          </Card>

          <Card title="Branch-wise Pricing" subtitle="This branch's selling price compared with the same product and size in other branches" bodyClassName="p-0">
            <DataTable columns={compareCols} rows={comparison} pageSize={10} dense
              empty={<EmptyState icon={Tags} title="Nothing to compare" text="This branch has no product variants yet." />} />
          </Card>

          <Card title="Recent Orders" subtitle={`${orders.length} orders in total`} bodyClassName="p-0"
            actions={<Button size="sm" variant="ghost" as="link" to={`/orders?branch=${id}`}>View all</Button>}>
            <DataTable columns={orderCols} rows={orders.slice(0, 8)} pageSize={8} onRowClick={(o) => navigate(`/orders/${o.id}`)}
              empty={<EmptyState icon={ShoppingBag} title="No orders yet" />} />
          </Card>
        </div>
      </div>

      <BranchFormModal open={editOpen} branch={branch} onClose={() => setEditOpen(false)} />
    </>
  )
}

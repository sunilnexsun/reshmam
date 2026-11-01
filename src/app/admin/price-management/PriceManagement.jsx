'use client'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from '@admin/_lib/navigation'
import { Building2, ExternalLink, History, Layers, Pencil, Percent, Plus, RotateCcw, Save, Tags, Trash2, Undo2 } from 'lucide-react'
import { Badge, Button, Card, DataTable, EmptyState, IconButton, Input, PageHeader, Segmented, StatusBadge, Thumb, Toggle, useConfirm, useToast } from '@admin/_components/ui'
import { removeVariant, useDb } from '@admin/_lib/store'
import { applyVariantChanges } from '@admin/_lib/productActions'
import { byId, stockStatus } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { cn, dateTime, inr, num } from '@admin/_lib/format'
import { discountPct, normSize } from '@admin/products/productUtils'
import PriceChange from '@admin/products/PriceChange'
import VariantModal from './VariantModal'
import BulkPriceModal from './BulkPriceModal'
import { currentValues, rowErrors, variantPatch, withEdit } from './priceDrafts'

export default function PriceManagement() {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('prices', 'manage')
  // Stock levels belong to Inventory: editing them here also needs inventory permission.
  const canEditStock = canManage && can('inventory', 'manage')
  const [params, setParams] = useSearchParams()

  const branches = useMemo(() => byId(db.branches), [db.branches])
  const products = useMemo(() => [...db.products].sort((a, b) => a.name.localeCompare(b.name)), [db.products])

  // ---- resolve selection (URL first, then sensible defaults) ----
  const pParam = params.get('product')
  const bParam = params.get('branch')
  const branchId = branches[bParam] ? bParam
    : (pParam && db.variants.find((v) => v.productId === pParam)?.branchId) || db.branches[0]?.id
  const productId = db.products.some((p) => p.id === pParam) ? pParam : firstProductIn(db, branchId)
  const branch = branches[branchId]
  const product = db.products.find((p) => p.id === productId)

  const rows = useMemo(() => db.variants.filter((v) => v.productId === productId && v.branchId === branchId).sort((a, b) => a.price - b.price), [db.variants, productId, branchId])
  const inBranch = useMemo(() => new Set(db.variants.filter((v) => v.branchId === branchId).map((v) => v.productId)), [db.variants, branchId])

  // ---- staged inline edits: { [variantId]: { only the fields the user typed into } } ----
  const [drafts, setDrafts] = useState({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null) // { variant } | { variant: null } for add
  const [bulkOpen, setBulkOpen] = useState(false)
  const [histScope, setHistScope] = useState('branch')

  const current = (v) => currentValues(v, drafts[v.id])
  const isDirty = (v) => Object.keys(variantPatch(drafts[v.id], v)).length > 0
  const dirtyRows = rows.filter(isDirty)
  const invalidRows = dirtyRows.filter((v) => Object.keys(rowErrors(current(v))).length)
  const anyDirty = dirtyRows.length > 0

  useEffect(() => {
    if (!anyDirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [anyDirty])

  const edit = (v, k, val) => setDrafts((d) => ({ ...d, [v.id]: withEdit(d[v.id], k, val) }))
  const resetRow = (v) => setDrafts((d) => { const n = { ...d }; delete n[v.id]; return n })
  const discard = () => { setDrafts({}); setNote('') }

  const select = async (next) => {
    if (anyDirty && !(await confirm({ title: 'Discard unsaved changes?', message: `You have ${dirtyRows.length} unsaved row${dirtyRows.length === 1 ? '' : 's'}. Switching will discard them.`, confirmText: 'Discard & Switch' }))) return
    discard()
    setParams((p) => { Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); return p }, { replace: true })
  }
  const onBranch = (id) => {
    const keep = db.variants.some((v) => v.productId === productId && v.branchId === id)
    select({ branch: id, product: keep ? productId : firstProductIn(db, id) || productId })
  }

  const saveAll = () => {
    if (invalidRows.length) return toast.error('Fix the highlighted values before saving.')
    setSaving(true)
    const changes = dirtyRows.map((v) => ({ id: v.id, patch: variantPatch(drafts[v.id], v) }))
    applyVariantChanges(changes, note.trim() || 'Updated in Price Management')
    toast.success(`Saved changes to ${changes.length} variant${changes.length === 1 ? '' : 's'}`)
    discard()
    setSaving(false)
  }

  const onRemove = async (v) => {
    const ok = await confirm({ title: 'Remove variant?', message: `Remove ${product.name} ${v.size} from ${branch.name}? Current stock (${num(v.stock)}) will no longer be tracked. Past price and stock history is kept.`, confirmText: 'Remove Variant' })
    if (!ok) return
    removeVariant(v.id)
    resetRow(v)
    toast.success(`${v.size} removed from ${branch.name}`)
  }

  // ---- comparison matrix: sizes × branches for this product ----
  const compare = useMemo(() => {
    const all = db.variants.filter((v) => v.productId === productId)
    const sizes = []
    all.slice().sort((a, b) => a.price - b.price).forEach((v) => { if (!sizes.some((s) => normSize(s) === normSize(v.size))) sizes.push(v.size) })
    const brs = db.branches.filter((b) => all.some((v) => v.branchId === b.id))
    const cell = (size, bid) => all.find((v) => v.branchId === bid && normSize(v.size) === normSize(size))
    return { sizes, brs, cell }
  }, [db.variants, db.branches, productId])

  const history = useMemo(() => db.priceHistory.filter((h) => h.productId === productId && (histScope === 'all' || h.branchId === branchId)).sort((a, b) => (a.date < b.date ? 1 : -1)), [db.priceHistory, productId, branchId, histScope])
  const histColumns = [
    { key: 'date', label: 'Date', sortable: true, render: (h) => <span className="whitespace-nowrap">{dateTime(h.date)}</span> },
    ...(histScope === 'all' ? [{ key: 'branch', label: 'Branch', render: (h) => <span className="whitespace-nowrap">{branches[h.branchId]?.name || '—'}</span> }] : []),
    { key: 'size', label: 'Size', render: (h) => <span className="whitespace-nowrap">{h.size}</span> },
    { key: 'price', label: 'Price', render: (h) => <PriceChange from={h.oldPrice} to={h.newPrice} /> },
    { key: 'mrp', label: 'MRP', render: (h) => <PriceChange from={h.oldMrp} to={h.newMrp} /> },
    { key: 'note', label: 'Note', render: (h) => <span className="block min-w-[140px] text-muted">{h.note || '—'}</span> },
    { key: 'user', label: 'Changed by', render: (h) => <span className="whitespace-nowrap">{h.user}</span> },
  ]

  if (!product || !branch) {
    return (
      <>
        <PageHeader title="Price Management" breadcrumbs={[{ label: 'Price Management' }]} />
        <EmptyState className="card" icon={Tags} title="No products or branches yet" text="Add a branch and a product first, then manage their prices here."
          action={can('products', 'manage') && <Button as="link" to="/products/new" icon={Plus}>Add Product</Button>} />
      </>
    )
  }

  const image = product.images?.[product.primaryImage || 0]
  const numInput = 'h-9 w-[92px] text-right tabular-nums'

  return (
    <>
      <PageHeader title="Price Management" subtitle="Branch-wise sizes, prices, MRP and stock. Every price change is recorded in Price History."
        breadcrumbs={[{ label: 'Price Management' }]}
        actions={canManage && <>
          <Button variant="outline" icon={Percent} onClick={() => setBulkOpen(true)}>Bulk Price Update</Button>
          <Button icon={Plus} onClick={() => setModal({ variant: null })}>Add Variant</Button>
        </>} />

      <Card className="mb-6" bodyClassName="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="pm-branch" className="label">Branch</label>
            <select id="pm-branch" className="input pr-8" value={branchId} onChange={(e) => onBranch(e.target.value)}>
              {db.branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.status !== 'Active' ? ' (inactive)' : ''}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="pm-product" className="label">Product</label>
            <select id="pm-product" className="input pr-8" value={productId} onChange={(e) => select({ branch: branchId, product: e.target.value })}>
              <optgroup label={`Sold at ${branch.name}`}>
                {products.filter((p) => inBranch.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}){p.status !== 'Active' ? ' – inactive' : ''}</option>)}
              </optgroup>
              <optgroup label="Not yet in this branch">
                {products.filter((p) => !inBranch.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </optgroup>
            </select>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="min-w-0 space-y-6">
          <Card bodyClassName="p-0">
            <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <Thumb src={image} alt={product.name} size={52} />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-ink sm:text-lg">{product.name} – {branch.name}</h2>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span>{product.category}</span><span aria-hidden>·</span><span className="font-mono">{product.sku}</span>
                    {product.status !== 'Active' && <StatusBadge status={product.status} />}
                    <Link to={`/products/${product.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">View product<ExternalLink className="h-3 w-3" /></Link>
                  </p>
                </div>
              </div>
              {canManage && rows.length > 0 && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setModal({ variant: null })} className="sm:ml-auto">Add Variant</Button>}
            </div>

            {rows.length === 0 ? (
              <EmptyState icon={Layers} title={`${product.name} is not sold at this branch yet`} text="Add a size with its price, MRP and opening stock to start selling here."
                action={canManage && <Button icon={Plus} onClick={() => setModal({ variant: null })}>Add Variant</Button>} />
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface/60">
                    <tr>
                      <th className="th">Size</th><th className="th">Unit</th><th className="th text-right">Price (₹)</th><th className="th text-right">MRP (₹)</th>
                      <th className="th text-right">Discount</th><th className="th text-right">Stock</th><th className="th">Status</th>{canManage && <th className="th text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((v) => {
                      const d = current(v)
                      const dirty = isDirty(v)
                      const err = dirty ? rowErrors(d) : {}
                      const disc = discountPct(d.price, d.mrp)
                      const changed = (k) => dirty && String(d[k]) !== String(v[k])
                      return (
                        <tr key={v.id} className={cn('transition-colors', dirty ? 'bg-amber-50/70' : 'hover:bg-surface/60')}>
                          <td className="td">
                            <div className="flex items-center gap-3">
                              <span className={cn('h-8 w-1 shrink-0 rounded-full', dirty ? 'bg-amber-400' : 'bg-transparent')} aria-hidden />
                              <div className="relative min-w-[90px]"><p className="font-semibold text-ink">{v.size}</p><p className="whitespace-nowrap font-mono text-[11px] text-muted">{v.sku}</p>{dirty && <span className="sr-only">(unsaved changes)</span>}</div>
                            </div>
                          </td>
                          <td className="td whitespace-nowrap text-muted">{v.unitType}</td>
                          <td className="td text-right">
                            {canManage ? <CellInput label={`Price for ${v.size}`} value={d.price} onChange={(x) => edit(v, 'price', x)} error={err.price} changed={changed('price')} className={numInput} />
                              : <b>{inr(v.price)}</b>}
                          </td>
                          <td className="td text-right">
                            {canManage ? <CellInput label={`MRP for ${v.size}`} value={d.mrp} onChange={(x) => edit(v, 'mrp', x)} error={err.mrp} changed={changed('mrp')} className={numInput} />
                              : <span className="text-muted">{inr(v.mrp)}</span>}
                          </td>
                          <td className="td text-right">{disc ? <Badge tone="green">{disc}%</Badge> : <span className="text-muted">—</span>}</td>
                          <td className="td text-right">
                            <div className="flex flex-col items-end gap-1">
                              {canEditStock ? <CellInput label={`Stock for ${v.size}`} value={d.stock} step="1" onChange={(x) => edit(v, 'stock', x)} error={err.stock} changed={changed('stock')} className={numInput} />
                                : <span className="font-medium">{num(v.stock)}</span>}
                              <StatusBadge status={stockStatus(Number(d.stock) || 0, v.alertStock)} />
                            </div>
                          </td>
                          <td className="td">
                            {canManage ? (
                              <div className="flex items-center gap-2">
                                <Toggle size="sm" className="relative [&_label]:sr-only" checked={d.status === 'Active'} onChange={(on) => edit(v, 'status', on ? 'Active' : 'Inactive')} label={`${v.size} active`} />
                                <span className={cn('text-xs', changed('status') ? 'font-semibold text-amber-700' : 'text-muted')}>{d.status}</span>
                              </div>
                            ) : <StatusBadge status={v.status} />}
                          </td>
                          {canManage && (
                            <td className="td">
                              <div className="flex justify-end gap-1">
                                {dirty && <IconButton icon={Undo2} size="sm" label={`Undo changes to ${v.size}`} onClick={() => resetRow(v)} />}
                                <IconButton icon={Pencil} size="sm" variant="primary" label={`Edit price of ${v.size}`} onClick={() => setModal({ variant: v })} />
                                <IconButton icon={Trash2} size="sm" variant="danger" label={`Remove ${v.size}`} onClick={() => onRemove(v)} />
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {canManage && rows.length > 0 && (
              <div className={cn('flex flex-col gap-3 border-t border-line p-4 lg:flex-row lg:items-center', anyDirty && 'bg-amber-50/50')}>
                <p className="text-sm text-muted lg:w-56 lg:shrink-0" aria-live="polite">
                  {anyDirty ? <><b className="text-ink">{dirtyRows.length}</b> row{dirtyRows.length === 1 ? '' : 's'} changed{invalidRows.length ? <span className="text-red-600"> · {invalidRows.length} with errors</span> : ''}</> : 'Edit price, MRP, stock or status above, then save.'}
                </p>
                <Input aria-label="Reason for change (saved in price history)" placeholder="Reason for change, e.g. Copra price increase" value={note} onChange={(e) => setNote(e.target.value)} disabled={!anyDirty} className="h-9 lg:flex-1" />
                <div className="flex gap-2">
                  <Button variant="outline" icon={RotateCcw} onClick={discard} disabled={!anyDirty} className="flex-1 lg:flex-none">Cancel</Button>
                  <Button icon={Save} onClick={saveAll} disabled={!anyDirty || invalidRows.length > 0} loading={saving} className="flex-1 lg:flex-none">Save Changes</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card title="Price History" subtitle={`${product.name}${histScope === 'branch' ? ` · ${branch.name}` : ' · all branches'}`} bodyClassName="p-0"
            actions={<Segmented value={histScope} onChange={setHistScope} options={[{ value: 'branch', label: 'This branch' }, { value: 'all', label: 'All branches' }]} />}>
            <DataTable columns={histColumns} rows={history} pageSize={10}
              empty={<EmptyState icon={History} title="No price changes yet" text="Saved changes to price or MRP will appear here with the reason and who made them." />} />
          </Card>

        <div className="min-w-0 space-y-6">
          <Card title="Branch Price Comparison" subtitle={`${product.name} across branches`} bodyClassName="p-0">
            {compare.brs.length === 0 ? <EmptyState icon={Building2} title="Not sold in any branch" className="py-8" /> : (
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface/60">
                    <tr>
                      <th className="th">Size</th>
                      {compare.brs.map((b) => (
                        <th key={b.id} className={cn('th text-right', b.id === branchId && 'bg-accent-soft/60 text-primary')}>
                          <button type="button" onClick={() => onBranch(b.id)} className="uppercase hover:text-primary" title={b.name}>{b.code}</button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {compare.sizes.map((s) => {
                      const cells = compare.brs.map((b) => compare.cell(s, b.id))
                      const ps = cells.filter(Boolean).map((c) => c.price)
                      const min = Math.min(...ps)
                      return (
                        <tr key={s}>
                          <td className="td whitespace-nowrap font-medium">{s}</td>
                          {compare.brs.map((b, i) => {
                            const c = cells[i]
                            return (
                              <td key={b.id} className={cn('td text-right', b.id === branchId && 'bg-accent-soft/30')}>
                                {c ? (
                                  <div className={cn('whitespace-nowrap', c.status !== 'Active' && 'opacity-50')}>
                                    <p className="font-semibold">{inr(c.price)}{ps.length > 1 && c.price === min && <span className="ml-1 rounded bg-accent-soft px-1 text-[10px] font-semibold text-primary">lowest</span>}</p>
                                    <p className="text-[11px] text-muted">MRP {inr(c.mrp)} · {num(c.stock)} pcs</p>
                                    {c.status !== 'Active' && <p className="text-[10px] text-muted">Inactive</p>}
                                  </div>
                                ) : <span className="text-muted">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <ul className="space-y-1 border-t border-line px-4 py-3 text-xs text-muted">
              {compare.brs.map((b) => <li key={b.id}><b className="text-ink">{b.code}</b> – {b.name}</li>)}
              {db.branches.length > compare.brs.length && <li>Not sold at: {db.branches.filter((b) => !compare.brs.includes(b)).map((b) => b.name).join(', ')}</li>}
            </ul>
          </Card>

          <Card title="Branch Summary" subtitle={branch.name}>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Variants" value={rows.length} />
              <Stat label="Active" value={rows.filter((v) => v.status === 'Active').length} />
              <Stat label="Total stock" value={num(rows.reduce((s, v) => s + v.stock, 0))} />
              <Stat label="Avg. discount" value={rows.length ? `${Math.round(rows.reduce((s, v) => s + discountPct(v.price, v.mrp), 0) / rows.length)}%` : '—'} />
            </dl>
          </Card>
        </div>
        </div>
      </div>

      <VariantModal open={!!modal} onClose={() => setModal(null)} product={product} branch={branch} variant={modal?.variant || null}
        onSaved={() => modal?.variant && resetRow(modal.variant)} />
      <BulkPriceModal open={bulkOpen} onClose={() => setBulkOpen(false)} db={db} defaultBranchId={branchId} />
    </>
  )
}

/** Earliest-added catalogue product sold at the branch (stable default), else the earliest product. */
function firstProductIn(db, branchId) {
  const byAge = [...db.products].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  return byAge.find((p) => db.variants.some((v) => v.productId === p.id && v.branchId === branchId))?.id || byAge[0]?.id
}

function Stat({ label, value }) {
  return <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 font-semibold text-ink">{value}</dd></div>
}

function CellInput({ label, value, onChange, error, changed, className, step = '0.01' }) {
  return (
    <div className="inline-flex flex-col items-end">
      <Input type="number" inputMode="decimal" min="0" step={step} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error}
        title={error || undefined} className={cn(className, changed && !error && 'border-amber-400 bg-white font-semibold')} />
      {error && <span role="alert" className="mt-0.5 max-w-[120px] text-right text-[11px] leading-tight text-red-600">{error}</span>}
    </div>
  )
}

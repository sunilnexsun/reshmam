import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge, Button, Checkbox, EmptyState, Field, Input, Modal, Segmented, Select, Thumb, useConfirm, useToast } from '../../components/ui'
import { applyVariantChanges } from '../../services/productActions'
import { CATEGORIES } from '../../data/seed'
import { cn, inr } from '../../utils/format'

const ROUNDING = [{ value: '1', label: 'Nearest ₹1' }, { value: '5', label: 'Nearest ₹5' }, { value: '0', label: 'No rounding (paise)' }]
const roundTo = (n, step) => (step > 0 ? Math.round(n / step) * step : Math.round(n * 100) / 100)

/** Increase / decrease prices of every variant in a branch (optionally one category) with a live preview. */
export default function BulkPriceModal(props) {
  // Mounted only while open, so every opening starts from fresh defaults.
  return props.open ? <BulkPriceForm {...props} /> : null
}

function BulkPriceForm({ open, onClose, db, defaultBranchId }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [f, setF] = useState(() => ({ branchId: defaultBranchId, category: 'all', target: 'both', direction: 'increase', mode: 'percent', amount: '5', rounding: '1', includeInactive: false, note: '' }))
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const products = useMemo(() => Object.fromEntries(db.products.map((p) => [p.id, p])), [db.products])
  const preview = useMemo(() => {
    const amt = Number(f.amount)
    const sign = f.direction === 'increase' ? 1 : -1
    const step = Number(f.rounding)
    const calc = (x) => roundTo(f.mode === 'percent' ? x * (1 + (sign * amt) / 100) : x + sign * amt, step)
    return db.variants
      .filter((v) => v.branchId === f.branchId && products[v.productId] && (f.category === 'all' || products[v.productId].category === f.category) && (f.includeInactive || v.status === 'Active'))
      .map((v) => {
        const newPrice = f.target === 'mrp' ? v.price : calc(v.price)
        const newMrp = f.target === 'price' ? v.mrp : calc(v.mrp)
        let problem = ''
        if (!(newPrice > 0)) problem = 'Price would be ₹0 or less'
        else if (newMrp < newPrice) problem = 'Price would exceed MRP'
        return { v, product: products[v.productId], newPrice, newMrp, problem, changed: newPrice !== v.price || newMrp !== v.mrp }
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name) || a.v.price - b.v.price)
  }, [f, db.variants, products])

  const amountOk = Number(f.amount) > 0 && (f.mode !== 'percent' || f.direction === 'increase' || Number(f.amount) < 100)
  const valid = preview.filter((r) => !r.problem && r.changed)
  const skipped = preview.filter((r) => r.problem)
  const branchName = db.branches.find((b) => b.id === f.branchId)?.name

  const onApply = async () => {
    if (!f.note.trim()) return toast.error('Add a short reason — it is saved with every price change.')
    const ok = await confirm({ tone: 'primary', title: 'Apply bulk price update?', message: `${valid.length} variant${valid.length === 1 ? '' : 's'} at ${branchName} will be updated${skipped.length ? ` (${skipped.length} skipped)` : ''}. Each change is recorded in Price History.`, confirmText: `Update ${valid.length} prices` })
    if (!ok) return
    applyVariantChanges(valid.map((r) => ({ id: r.v.id, patch: { price: r.newPrice, mrp: r.newMrp } })), `Bulk update: ${f.note.trim()}`)
    toast.success(`${valid.length} prices updated at ${branchName}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Bulk Price Update" subtitle="Change many prices at once. Review the preview before applying."
      footer={<>
        <p className="mr-auto self-center text-xs text-muted">{valid.length} will change{skipped.length ? ` · ${skipped.length} skipped` : ''}</p>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onApply} disabled={!amountOk || !valid.length}>Apply to {valid.length} variant{valid.length === 1 ? '' : 's'}</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Branch" htmlFor="bp-branch"><Select id="bp-branch" value={f.branchId} onChange={(e) => set('branchId')(e.target.value)} options={db.branches.map((b) => ({ value: b.id, label: b.name }))} /></Field>
        <Field label="Category" htmlFor="bp-cat"><Select id="bp-cat" value={f.category} onChange={(e) => set('category')(e.target.value)} options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES]} /></Field>
        <Field label="Apply to" htmlFor="bp-target"><Select id="bp-target" value={f.target} onChange={(e) => set('target')(e.target.value)} options={[{ value: 'both', label: 'Price & MRP' }, { value: 'price', label: 'Selling price only' }, { value: 'mrp', label: 'MRP only' }]} /></Field>
        <Field label="Rounding" htmlFor="bp-round"><Select id="bp-round" value={f.rounding} onChange={(e) => set('rounding')(e.target.value)} options={ROUNDING} /></Field>
        <div className="flex flex-col gap-1.5">
          <span className="label mb-0">Change</span>
          <Segmented value={f.direction} onChange={set('direction')} options={[{ value: 'increase', label: 'Increase' }, { value: 'decrease', label: 'Decrease' }]} size="md" className="w-fit" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label mb-0">By</span>
          <Segmented value={f.mode} onChange={set('mode')} options={[{ value: 'percent', label: 'Percent' }, { value: 'flat', label: 'Rupees' }]} size="md" className="w-fit" />
        </div>
        <Field label={f.mode === 'percent' ? 'Percentage' : 'Amount (₹)'} required htmlFor="bp-amt" error={!amountOk ? (f.mode === 'percent' && f.direction === 'decrease' ? 'Enter between 0 and 100' : 'Enter a value above 0') : undefined}>
          <Input id="bp-amt" type="number" min="0" step="0.01" inputMode="decimal" value={f.amount} error={!amountOk} onChange={(e) => set('amount')(e.target.value)} />
        </Field>
        <Field label="Reason" required htmlFor="bp-note" hint="Saved in Price History">
          <Input id="bp-note" placeholder="e.g. Seed cost revision" value={f.note} onChange={(e) => set('note')(e.target.value)} />
        </Field>
        <Checkbox className="sm:col-span-2 lg:col-span-4" label="Include inactive variants" checked={f.includeInactive} onChange={(e) => set('includeInactive')(e.target.checked)} />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-line">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/60 px-4 py-2.5 text-sm">
          <span className="font-semibold">Preview</span>
          <Badge tone="primary">{preview.length} variants</Badge>
          {skipped.length > 0 && <Badge tone="amber"><AlertTriangle className="h-3 w-3" />{skipped.length} will be skipped</Badge>}
        </div>
        {preview.length === 0 ? <EmptyState title="No variants match" text="Choose another branch or category." className="py-8" /> : (
          <div className="scroll-thin max-h-[340px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_var(--color-line)]">
                <tr><th className="th">Product</th><th className="th">Price</th><th className="th">MRP</th><th className="th">Result</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.map((r) => (
                  <tr key={r.v.id} className={cn(r.problem && 'bg-amber-50/60')}>
                    <td className="td"><div className="flex min-w-[180px] items-center gap-2"><Thumb src={r.product.images?.[r.product.primaryImage || 0]} size={32} /><div className="min-w-0"><p className="truncate font-medium">{r.product.name}</p><p className="text-xs text-muted">{r.v.size}{r.v.status !== 'Active' ? ' · Inactive' : ''}</p></div></div></td>
                    <td className="td whitespace-nowrap">{inr(r.v.price)} <ArrowRight className="inline h-3 w-3 text-muted" aria-label="to" /> <b>{inr(r.newPrice, r.newPrice % 1 !== 0)}</b></td>
                    <td className="td whitespace-nowrap">{inr(r.v.mrp)} <ArrowRight className="inline h-3 w-3 text-muted" aria-label="to" /> <b>{inr(r.newMrp, r.newMrp % 1 !== 0)}</b></td>
                    <td className="td">{r.problem ? <Badge tone="amber">{r.problem}</Badge> : r.changed ? <Badge tone="green">Will update</Badge> : <Badge>No change</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

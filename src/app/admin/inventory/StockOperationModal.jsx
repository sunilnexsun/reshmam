import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Field, Input, Modal, Select, Textarea, Thumb, useToast } from '@admin/_components/ui'
import { adjustStock, getState, useDb } from '@admin/_lib/store'
import { inr, num } from '@admin/_lib/format'
import { OPERATIONS, inputDateToIso, signed, todayStr } from './inventoryUtils'

const OUT_REASONS = ['Counter / offline sale', 'Free sample', 'Internal use', 'Expired', 'Other']
const blank = { branchId: '', productId: '', variantId: '', qty: '', date: '', reference: '', supplier: '', cost: '', reason: OUT_REASONS[0], notes: '' }

/** Stock In / Purchase Entry / Stock Out / Damaged / Adjustment. `variant` pre-selects branch → product → size. */
export default function StockOperationModal({ open, type, variant, onClose }) {
  const db = useDb()
  const toast = useToast()
  const op = OPERATIONS[type] || OPERATIONS['Stock In']
  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank })
  useEffect(() => {
    if (!open) return
    reset({ ...blank, date: todayStr(), branchId: variant?.branchId || '', productId: variant?.productId || '', variantId: variant?.id || '', qty: type === 'Adjustment' && variant ? String(variant.stock) : '' })
  }, [open, variant, type, reset])

  const [branchId, productId, variantId, qtyRaw, cost] = useWatch({ control, name: ['branchId', 'productId', 'variantId', 'qty', 'cost'] })
  const products = useMemo(() => {
    const ids = new Set(db.variants.filter((v) => v.branchId === branchId).map((v) => v.productId))
    return db.products.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [db.variants, db.products, branchId])
  const sizes = useMemo(() => db.variants.filter((v) => v.branchId === branchId && v.productId === productId), [db.variants, branchId, productId])
  const v = db.variants.find((x) => x.id === variantId)
  const product = db.products.find((p) => p.id === productId)
  const qty = Number(qtyRaw)
  const after = v && qtyRaw !== '' && Number.isFinite(qty) ? (op.mode === 'set' ? qty : op.mode === 'add' ? v.stock + qty : v.stock - qty) : null

  const onSubmit = (f) => {
    const cur = getState().variants.find((x) => x.id === f.variantId)
    if (!cur) return toast.error('Select a product size.')
    const q = Number(f.qty)
    if (op.mode === 'set' && q === cur.stock) return toast.error(`Counted stock matches the current stock (${cur.stock}). Nothing to adjust.`)
    let notes = f.notes.trim()
    if (type === 'Purchase Entry') {
      const c = Number(f.cost)
      notes = [`Supplier: ${f.supplier.trim()}`, `Cost/unit: ₹${c}`, `Purchase value: ₹${Math.round(c * q * 100) / 100}`, notes].filter(Boolean).join(' · ')
    } else if (type === 'Stock Out') notes = [f.reason, notes].filter(Boolean).join(' · ')
    try {
      const before = cur.stock
      const balance = adjustStock({ variantId: cur.id, type, qty: q, reference: f.reference.trim(), notes, date: inputDateToIso(f.date) })
      const p = getState().products.find((x) => x.id === cur.productId)
      toast.success(`${p?.name} ${cur.size}: ${before} → ${balance} (${signed(balance - before)})`, { title: `${op.title} saved` })
      if (balance <= 0) toast.warning(`${p?.name} ${cur.size} is now out of stock at this branch.`, { title: 'Out of stock' })
      else if (balance <= cur.alertStock) toast.warning(`${p?.name} ${cur.size} is down to ${balance} (alert level ${cur.alertStock}).`, { title: 'Low stock' })
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const qtyRules = op.mode === 'set'
    ? { required: 'Enter the counted stock', validate: (x) => (Number.isInteger(Number(x)) && Number(x) >= 0) || 'Enter a whole number, 0 or more' }
    : { required: 'Enter a quantity', validate: (x) => { const n = Number(x); if (!Number.isInteger(n) || n <= 0) return 'Quantity must be a whole number greater than 0'; if (op.mode === 'remove' && v && n > v.stock) return `Only ${v.stock} available — cannot remove ${n}`; return true } }

  return (
    <Modal open={open} onClose={onClose} title={op.title} subtitle={op.desc} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="stock-op-form" loading={isSubmitting} variant={op.mode === 'remove' ? 'danger' : 'primary'}>{op.submit}</Button></>}>
      <form id="stock-op-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch" required htmlFor="so-branch" error={errors.branchId} className="sm:col-span-2">
          <Select id="so-branch" placeholder="Select branch" options={db.branches.map((b) => ({ value: b.id, label: b.name }))} error={errors.branchId}
            {...register('branchId', { required: 'Select a branch', onChange: () => { setValue('productId', ''); setValue('variantId', '') } })} />
        </Field>
        <Field label="Product" required htmlFor="so-product" error={errors.productId} hint={branchId && !products.length ? 'No products are listed at this branch yet.' : undefined}>
          <Select id="so-product" placeholder={branchId ? 'Select product' : 'Select a branch first'} disabled={!branchId} options={products.map((p) => ({ value: p.id, label: p.status === 'Active' ? p.name : `${p.name} (inactive)` }))} error={errors.productId}
            {...register('productId', { required: 'Select a product', onChange: (e) => { const vs = getState().variants.filter((x) => x.branchId === branchId && x.productId === e.target.value); setValue('variantId', vs.length === 1 ? vs[0].id : '') } })} />
        </Field>
        <Field label="Size" required htmlFor="so-variant" error={errors.variantId}>
          <Select id="so-variant" placeholder={productId ? 'Select size' : 'Select a product first'} disabled={!productId} options={sizes.map((x) => ({ value: x.id, label: `${x.size} — ${num(x.stock)} in stock` }))} error={errors.variantId}
            {...register('variantId', { required: 'Select a size' })} />
        </Field>

        {v && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-3 sm:col-span-2">
            <Thumb src={product?.images?.[product.primaryImage || 0]} alt="" size={44} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{product?.name} · {v.size}</p>
              <p className="text-xs text-muted">SKU {v.sku} · Alert level {v.alertStock} · Price {inr(v.price)}</p>
            </div>
            <div className="text-right text-sm" aria-live="polite">
              <p className="text-xs text-muted">Current → After</p>
              <p className="font-semibold whitespace-nowrap">{num(v.stock)} → <span className={after == null ? 'text-muted' : after < 0 ? 'text-red-600' : after <= v.alertStock ? 'text-amber-700' : 'text-accent'}>{after == null ? '—' : num(after)}</span></p>
            </div>
          </div>
        )}

        <Field label={op.mode === 'set' ? 'Counted Stock (new level)' : 'Quantity'} required htmlFor="so-qty" error={errors.qty}
          hint={op.mode === 'remove' && v ? `Up to ${num(v.stock)} available` : op.mode === 'set' ? 'Enter the actual quantity on the shelf' : undefined}>
          <Input id="so-qty" type="number" inputMode="numeric" min={op.mode === 'set' ? 0 : 1} step={1} max={op.mode === 'remove' && v ? v.stock : undefined} error={errors.qty} {...register('qty', qtyRules)} />
        </Field>
        <Field label="Date" required htmlFor="so-date" error={errors.date}>
          <Input id="so-date" type="date" max={todayStr()} error={errors.date} {...register('date', { required: 'Select a date', validate: (x) => x <= todayStr() || 'Date cannot be in the future' })} />
        </Field>

        {type === 'Purchase Entry' && <>
          <Field label="Supplier Name" required htmlFor="so-supplier" error={errors.supplier}>
            <Input id="so-supplier" placeholder="e.g. Sri Murugan Oil Seeds" error={errors.supplier} {...register('supplier', { required: 'Supplier name is required', minLength: { value: 2, message: 'Too short' } })} />
          </Field>
          <Field label="Invoice / Bill No." required htmlFor="so-ref" error={errors.reference}>
            <Input id="so-ref" placeholder="e.g. INV-2045" error={errors.reference} {...register('reference', { required: 'Invoice number is required' })} />
          </Field>
          <Field label="Cost per Unit (₹)" required htmlFor="so-cost" error={errors.cost} hint={Number(cost) > 0 && qty > 0 ? `Purchase value ${inr(Number(cost) * qty, true)}` : undefined}>
            <Input id="so-cost" type="number" inputMode="decimal" min="0.01" step="0.01" error={errors.cost} {...register('cost', { required: 'Cost per unit is required', validate: (x) => Number(x) > 0 || 'Enter a cost greater than 0' })} />
          </Field>
        </>}
        {type === 'Stock Out' && (
          <Field label="Reason" htmlFor="so-reason"><Select id="so-reason" options={OUT_REASONS} {...register('reason')} /></Field>
        )}
        {type !== 'Purchase Entry' && (
          <Field label="Reference" hint={type === 'Stock In' ? 'GRN / delivery challan no.' : type === 'Damaged' ? 'e.g. DMG-103' : 'Optional'} htmlFor="so-ref2">
            <Input id="so-ref2" {...register('reference')} />
          </Field>
        )}
        <Field label={type === 'Damaged' || type === 'Adjustment' ? 'Reason / Notes' : 'Notes'} required={type === 'Damaged' || type === 'Adjustment'} htmlFor="so-notes" error={errors.notes} className="sm:col-span-2">
          <Textarea id="so-notes" rows={2} error={errors.notes} placeholder={type === 'Damaged' ? 'e.g. Cans leaked during unloading' : type === 'Adjustment' ? 'e.g. Monthly physical stock count' : ''}
            {...register('notes', type === 'Damaged' || type === 'Adjustment' ? { required: 'Please add a reason', minLength: { value: 3, message: 'Reason is too short' } } : {})} />
        </Field>
      </form>
    </Modal>
  )
}

import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowRight } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { getState, transferStock, useDb } from '@admin/_lib/store'
import { num } from '@admin/_lib/format'
import { inputDateToIso, todayStr } from './inventoryUtils'

const blank = { fromBranchId: '', toBranchId: '', productId: '', variantId: '', qty: '', date: '', notes: '' }

/** Move stock of one product size between branches. The destination listing is created if missing. */
export default function TransferModal({ open, variant, onClose }) {
  const db = useDb()
  const toast = useToast()
  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank })
  useEffect(() => {
    if (!open) return
    reset({ ...blank, date: todayStr(), fromBranchId: variant?.branchId || '', productId: variant?.productId || '', variantId: variant && variant.stock > 0 ? variant.id : '' })
  }, [open, variant, reset])

  const [fromId, toId, productId, variantId, qtyRaw] = useWatch({ control, name: ['fromBranchId', 'toBranchId', 'productId', 'variantId', 'qty'] })
  const available = useMemo(() => db.variants.filter((v) => v.branchId === fromId && v.stock > 0), [db.variants, fromId])
  const products = useMemo(() => {
    const ids = new Set(available.map((v) => v.productId))
    return db.products.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [available, db.products])
  const sizes = available.filter((v) => v.productId === productId)
  const src = db.variants.find((v) => v.id === variantId)
  const dst = src && toId ? db.variants.find((v) => v.productId === src.productId && v.branchId === toId && v.size === src.size) : null
  const qty = Number(qtyRaw) || 0
  const toBranch = db.branches.find((b) => b.id === toId)

  const onSubmit = (f) => {
    try {
      const before = getState().variants.find((x) => x.id === f.variantId)
      const ref = transferStock({ fromBranchId: f.fromBranchId, toBranchId: f.toBranchId, variantId: f.variantId, qty: Number(f.qty), date: inputDateToIso(f.date), notes: f.notes.trim() })
      const p = getState().products.find((x) => x.id === before.productId)
      const left = before.stock - Number(f.qty)
      toast.success(`${f.qty} × ${p?.name} ${before.size} moved to ${toBranch?.name}.`, { title: `Transfer ${ref} completed` })
      if (left <= 0) toast.warning(`${p?.name} ${before.size} is now out of stock at the source branch.`, { title: 'Out of stock' })
      else if (left <= before.alertStock) toast.warning(`${p?.name} ${before.size} is down to ${left} at the source branch (alert level ${before.alertStock}).`, { title: 'Low stock' })
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const branchOpts = db.branches.map((b) => ({ value: b.id, label: b.name }))
  return (
    <Modal open={open} onClose={onClose} title="Transfer Stock" subtitle="Move stock of a product size from one branch to another." size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="transfer-form" loading={isSubmitting}>Submit Transfer</Button></>}>
      <form id="transfer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="From Branch" required htmlFor="tr-from" error={errors.fromBranchId}>
          <Select id="tr-from" placeholder="Select source branch" options={branchOpts} error={errors.fromBranchId}
            {...register('fromBranchId', { required: 'Select the source branch', onChange: (e) => { setValue('productId', ''); setValue('variantId', ''); if (e.target.value === toId) setValue('toBranchId', '') } })} />
        </Field>
        <Field label="To Branch" required htmlFor="tr-to" error={errors.toBranchId}>
          <Select id="tr-to" placeholder="Select destination branch" options={branchOpts.filter((b) => b.value !== fromId)} error={errors.toBranchId}
            {...register('toBranchId', { required: 'Select the destination branch', validate: (x, all) => x !== all.fromBranchId || 'Destination must differ from the source' })} />
        </Field>
        <Field label="Product" required htmlFor="tr-product" error={errors.productId} hint={fromId && !products.length ? 'No stock available at this branch.' : undefined}>
          <Select id="tr-product" placeholder={fromId ? 'Select product' : 'Select source branch first'} disabled={!fromId} options={products.map((p) => ({ value: p.id, label: p.name }))} error={errors.productId}
            {...register('productId', { required: 'Select a product', onChange: (e) => { const vs = available.filter((x) => x.productId === e.target.value); setValue('variantId', vs.length === 1 ? vs[0].id : '') } })} />
        </Field>
        <Field label="Size" required htmlFor="tr-variant" error={errors.variantId}>
          <Select id="tr-variant" placeholder={productId ? 'Select size' : 'Select a product first'} disabled={!productId} options={sizes.map((v) => ({ value: v.id, label: `${v.size} — ${num(v.stock)} available` }))} error={errors.variantId}
            {...register('variantId', { required: 'Select a size' })} />
        </Field>
        <Field label="Quantity" required htmlFor="tr-qty" error={errors.qty} hint={src ? `Up to ${num(src.stock)} available` : undefined}>
          <Input id="tr-qty" type="number" inputMode="numeric" min={1} step={1} max={src?.stock} error={errors.qty}
            {...register('qty', { required: 'Enter a quantity', validate: (x) => { const n = Number(x); if (!Number.isInteger(n) || n <= 0) return 'Quantity must be a whole number greater than 0'; if (src && n > src.stock) return `Only ${src.stock} available at the source branch`; return true } })} />
        </Field>
        <Field label="Transfer Date" required htmlFor="tr-date" error={errors.date}>
          <Input id="tr-date" type="date" max={todayStr()} error={errors.date} {...register('date', { required: 'Select a date', validate: (x) => x <= todayStr() || 'Date cannot be in the future' })} />
        </Field>
        <Field label="Notes" htmlFor="tr-notes" className="sm:col-span-2"><Textarea id="tr-notes" rows={2} placeholder="e.g. Festival demand at sub branch" {...register('notes')} /></Field>

        {src && toId && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-line bg-surface/60 p-3 text-sm sm:col-span-2" aria-live="polite">
            <div className="min-w-0"><p className="truncate text-xs text-muted">{db.branches.find((b) => b.id === fromId)?.name}</p><p className="font-semibold">{num(src.stock)} → {num(Math.max(0, src.stock - qty))}</p></div>
            <ArrowRight className="h-4 w-4 text-accent" aria-hidden />
            <div className="min-w-0 text-right"><p className="truncate text-xs text-muted">{toBranch?.name}</p><p className="font-semibold">{num(dst?.stock || 0)} → {num((dst?.stock || 0) + qty)}</p></div>
            {!dst && <p className="col-span-3 text-xs text-muted">{src.size} is not listed at {toBranch?.name} yet — a new listing will be created with the same price ({`₹${src.price}`}).</p>}
          </div>
        )}
      </form>
    </Modal>
  )
}

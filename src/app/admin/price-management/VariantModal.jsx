import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Badge, Button, Field, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { addVariant, getState, updateVariant } from '@admin/_lib/store'
import { UNIT_TYPES } from '@admin/_lib/seed'
import { inr } from '@admin/_lib/format'
import { discountPct, normSize, variantSku } from '@admin/products/productUtils'

/**
 * Add a variant (variant = null) or edit an existing one's size / price / MRP / alert level.
 * product & branch are the current selection in Price Management.
 */
export default function VariantModal({ open, onClose, product, branch, variant, onSaved }) {
  const toast = useToast()
  const isEdit = !!variant
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()
  useEffect(() => {
    if (!open) return
    reset(variant
      ? { size: variant.size, unitType: variant.unitType || product?.unitType || 'Bottle', price: String(variant.price), mrp: String(variant.mrp), alertStock: String(variant.alertStock ?? 10), note: '' }
      : { size: '', unitType: product?.unitType || 'Bottle', price: '', mrp: '', stock: '0', alertStock: '10', status: 'Active', note: '' })
  }, [open, variant, product, reset])

  const price = watch('price')
  const mrp = watch('mrp')
  const disc = discountPct(price, mrp)

  const onSubmit = (v) => {
    const size = v.size.trim()
    const dup = getState().variants.some((x) => x.productId === product.id && x.branchId === branch.id && x.id !== variant?.id && normSize(x.size) === normSize(size))
    if (dup) return toast.error(`${size} already exists for ${product.name} at ${branch.name}.`)
    if (isEdit) {
      const patch = { size, unitType: v.unitType, price: Number(v.price), mrp: Number(v.mrp), alertStock: Number(v.alertStock) }
      if (normSize(size) !== normSize(variant.size)) patch.sku = variantSku(product.sku, branch, size)
      updateVariant(variant.id, patch, v.note.trim())
      toast.success(`${product.name} ${size} updated`)
    } else {
      addVariant({
        productId: product.id, branchId: branch.id, size, unitType: v.unitType, sku: variantSku(product.sku, branch, size),
        price: Number(v.price), mrp: Number(v.mrp), stock: Number(v.stock), alertStock: Number(v.alertStock), status: v.status,
      })
      toast.success(`${size} added to ${branch.name}`)
    }
    onSaved?.()
    onClose()
  }
  const numRule = (label, min = 0, integer = false) => ({
    required: `${label} is required`,
    validate: (x) => (integer ? Number.isInteger(Number(x)) : Number.isFinite(Number(x))) && Number(x) >= min || (integer ? `Enter a whole number ≥ ${min}` : `${label} must be more than 0`),
  })

  return (
    <Modal open={open} onClose={onClose} size="lg" title={isEdit ? `Edit ${variant.size}` : 'Add Variant'}
      subtitle={product && branch ? `${product.name} · ${branch.name}` : undefined}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="variant-form" loading={isSubmitting}>{isEdit ? 'Save Price' : 'Add Variant'}</Button></>}>
      <form id="variant-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Size / Weight" required error={errors.size} htmlFor="vm-size">
          <Input id="vm-size" placeholder="e.g. 500 ml" error={errors.size} {...register('size', { required: 'Size is required' })} />
        </Field>
        <Field label="Unit Type" htmlFor="vm-unit"><Select id="vm-unit" options={UNIT_TYPES} {...register('unitType')} /></Field>
        <Field label="Selling Price (₹)" required error={errors.price} htmlFor="vm-price">
          <Input id="vm-price" type="number" inputMode="decimal" min="0" step="0.01" error={errors.price} {...register('price', { required: 'Price is required', validate: (x) => Number(x) > 0 || 'Price must be more than 0', deps: ['mrp'] })} />
        </Field>
        <Field label="MRP (₹)" required error={errors.mrp} htmlFor="vm-mrp" hint={disc ? `${disc}% below MRP` : 'Must be at least the selling price'}>
          <Input id="vm-mrp" type="number" inputMode="decimal" min="0" step="0.01" error={errors.mrp} {...register('mrp', { required: 'MRP is required', validate: (x, fv) => Number(x) >= Number(fv.price) || 'MRP must be ≥ selling price' })} />
        </Field>
        {!isEdit && (
          <Field label="Opening Stock" required error={errors.stock} htmlFor="vm-stock" hint="Recorded as a Stock In entry">
            <Input id="vm-stock" type="number" inputMode="numeric" min="0" step="1" error={errors.stock} {...register('stock', numRule('Stock', 0, true))} />
          </Field>
        )}
        <Field label="Alert Stock" required error={errors.alertStock} htmlFor="vm-alert" hint="Low-stock warning at or below this level">
          <Input id="vm-alert" type="number" inputMode="numeric" min="0" step="1" error={errors.alertStock} {...register('alertStock', numRule('Alert stock', 0, true))} />
        </Field>
        {!isEdit && <Field label="Status" htmlFor="vm-status"><Select id="vm-status" options={['Active', 'Inactive']} {...register('status')} /></Field>}
        {isEdit && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted sm:col-span-2">
            Current: <b className="text-ink">{inr(variant.price)}</b> / MRP {inr(variant.mrp)}
            {(Number(price) !== variant.price || Number(mrp) !== variant.mrp) && Number(price) > 0 && <><span aria-hidden>→</span><Badge tone="amber">New {inr(price)} / MRP {inr(mrp)}</Badge></>}
          </div>
        )}
        {isEdit && (
          <Field label="Reason for change" htmlFor="vm-note" className="sm:col-span-2" hint="Saved in Price History">
            <Textarea id="vm-note" rows={2} placeholder="e.g. Copra price increase" {...register('note')} />
          </Field>
        )}
      </form>
    </Modal>
  )
}

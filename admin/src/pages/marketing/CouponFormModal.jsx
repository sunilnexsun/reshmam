import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui'
import { createItem, getState, logActivity, updateItem } from '../../services/store'
import { inr } from '../../utils/format'
import { todayISO } from './marketingUtils'

const blank = () => {
  const to = new Date(); to.setDate(to.getDate() + 30)
  return { code: '', description: '', type: 'Percentage', value: '', minOrder: 0, maxDiscount: '', usageLimit: 100, validFrom: todayISO(), validTo: todayISO(to), status: 'Active' }
}
const n = (v) => (v === '' || v == null ? NaN : Number(v))

/** Add / edit a coupon. coupon null → create. */
export default function CouponFormModal({ open, onClose, coupon }) {
  const toast = useToast()
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank() })
  useEffect(() => {
    if (!open) return
    reset(coupon ? { ...blank(), ...coupon, status: coupon.status === 'Inactive' ? 'Inactive' : 'Active', maxDiscount: coupon.type === 'Flat' ? '' : coupon.maxDiscount ?? '' } : blank())
  }, [open, coupon, reset])

  const [type, value, minOrder, maxDiscount] = useWatch({ control, name: ['type', 'value', 'minOrder', 'maxDiscount'] })
  const preview = Number(value) > 0
    ? `${type === 'Percentage' ? `${Number(value)}% off` : `${inr(value)} off`}${type === 'Percentage' && Number(maxDiscount) > 0 ? `, up to ${inr(maxDiscount)}` : ''}${Number(minOrder) > 0 ? ` on orders of ${inr(minOrder)} or more` : ' on any order'}`
    : 'Enter a discount value to preview the offer.'

  const onSubmit = (v) => {
    const code = v.code.trim().toUpperCase()
    const dup = getState().coupons.find((c) => c.id !== coupon?.id && c.code.toUpperCase() === code)
    if (dup) return toast.error(`Coupon code ${code} already exists.`)
    const data = {
      code, description: v.description.trim(), type: v.type, value: Number(v.value), minOrder: Number(v.minOrder) || 0,
      maxDiscount: v.type === 'Flat' ? Number(v.value) : Number(v.maxDiscount) || 0,
      usageLimit: Number(v.usageLimit), validFrom: v.validFrom, validTo: v.validTo, status: v.status,
    }
    if (coupon) updateItem('coupons', coupon.id, data)
    else createItem('coupons', { ...data, used: 0 }, 'cp')
    logActivity('marketing', `Coupon ${coupon ? 'updated' : 'created'}: ${code}`)
    toast.success(coupon ? `Coupon ${code} updated` : `Coupon ${code} created`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={coupon ? `Edit Coupon ${coupon.code}` : 'Create Coupon'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="coupon-form" loading={isSubmitting}>{coupon ? 'Save Changes' : 'Create Coupon'}</Button></>}>
      <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Coupon Code" required error={errors.code} hint="Letters, numbers, - or _ (3–20). Saved in uppercase." htmlFor="cp-code">
          <Input id="cp-code" autoComplete="off" className="font-mono uppercase" error={errors.code} placeholder="DIWALI10"
            {...register('code', { required: 'Coupon code is required', setValueAs: (x) => String(x || '').toUpperCase().trim(), pattern: { value: /^[A-Z0-9_-]{3,20}$/, message: 'Use 3–20 letters, numbers, - or _ (no spaces)' } })} />
        </Field>
        <Field label="Status" htmlFor="cp-status"><Select id="cp-status" options={['Active', 'Inactive']} {...register('status')} /></Field>
        <Field label="Description" htmlFor="cp-desc" className="sm:col-span-2" error={errors.description}>
          <Textarea id="cp-desc" rows={2} placeholder="Shown to customers at checkout" {...register('description', { maxLength: { value: 160, message: 'Keep it under 160 characters' } })} />
        </Field>
        <Field label="Discount Type" htmlFor="cp-type"><Select id="cp-type" options={[{ value: 'Percentage', label: 'Percentage (%)' }, { value: 'Flat', label: 'Flat amount (₹)' }]} {...register('type')} /></Field>
        <Field label={type === 'Percentage' ? 'Discount (%)' : 'Discount (₹)'} required error={errors.value} htmlFor="cp-value">
          <Input id="cp-value" type="number" inputMode="decimal" min={1} step="any" error={errors.value}
            {...register('value', { validate: (x) => { const v = n(x); if (!(v > 0)) return 'Enter a discount greater than 0'; if (type === 'Percentage' && v > 100) return 'Percentage cannot exceed 100'; return true } })} />
        </Field>
        <Field label="Minimum Order (₹)" error={errors.minOrder} htmlFor="cp-min">
          <Input id="cp-min" type="number" inputMode="numeric" min={0} error={errors.minOrder}
            {...register('minOrder', { validate: (x) => x === '' || n(x) >= 0 || 'Cannot be negative' })} />
        </Field>
        {type === 'Percentage' ? (
          <Field label="Maximum Discount (₹)" hint="Leave empty for no cap" error={errors.maxDiscount} htmlFor="cp-max">
            <Input id="cp-max" type="number" inputMode="numeric" min={0} error={errors.maxDiscount}
              {...register('maxDiscount', { validate: (x) => x === '' || n(x) > 0 || 'Must be greater than 0' })} />
          </Field>
        ) : (
          <Field label="Maximum Discount (₹)" hint="Flat coupons always give exactly the discount amount.">
            <Input value={Number(value) > 0 ? value : ''} disabled aria-label="Maximum discount (same as flat amount)" />
          </Field>
        )}
        <Field label="Usage Limit" required hint="Total redemptions allowed" error={errors.usageLimit} htmlFor="cp-limit">
          <Input id="cp-limit" type="number" inputMode="numeric" min={1} step={1} error={errors.usageLimit}
            {...register('usageLimit', { validate: (x) => { const v = n(x); if (!(v >= 1) || !Number.isInteger(v)) return 'Enter a whole number of at least 1'; if (coupon && v < (coupon.used || 0)) return `Already used ${coupon.used} times — limit cannot be lower`; return true } })} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Valid From" required error={errors.validFrom} htmlFor="cp-from">
          <Input id="cp-from" type="date" error={errors.validFrom} {...register('validFrom', { required: 'Start date is required' })} />
        </Field>
        <Field label="Valid To" required error={errors.validTo} htmlFor="cp-to">
          <Input id="cp-to" type="date" error={errors.validTo}
            {...register('validTo', { required: 'End date is required', validate: (x, all) => !all.validFrom || x >= all.validFrom || 'End date must be on or after the start date' })} />
        </Field>
        <div className="rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2.5 text-sm text-primary sm:col-span-2" aria-live="polite">
          <span className="font-semibold">Preview:</span> {preview}
        </div>
      </form>
    </Modal>
  )
}

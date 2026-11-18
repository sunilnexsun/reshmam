import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Checkbox, Field, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, getState, logActivity, updateItem } from '@admin/_lib/store'

export const INDIAN_STATES = ['Andhra Pradesh', 'Karnataka', 'Kerala', 'Maharashtra', 'Puducherry', 'Tamil Nadu', 'Telangana', 'Delhi', 'Gujarat', 'West Bengal', 'Other']
const empty = { name: '', phone: '', email: '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '', status: 'Active', tags: '', notes: '', whatsappOptIn: true }

/** Add / edit customer. `customer` null → create. Calls onSaved(customer). */
export default function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const toast = useToast()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: empty })
  const customerId = customer?.id || null
  useEffect(() => {
    if (!open) return
    const addr = customer?.address || {}
    reset(
      customer
        ? {
            ...empty,
            ...customer,
            ...addr,
            line1: addr.line1 || addr.street || '',
            line2: addr.line2 || '',
            city: addr.city || '',
            state: addr.state || 'Tamil Nadu',
            pincode: addr.pincode || '',
            tags: (customer.tags || []).join(', '),
          }
        : empty
    )
    // Only reset when modal opens or switches to a different customer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId, reset])

  const onSubmit = (v) => {
    const phoneDigits = (v.phone || '').replace(/\D/g, '').slice(-10)
    const dup = getState().customers.find(
      (c) =>
        c.id !== customer?.id &&
        ((c.phone || '').replace(/\D/g, '').slice(-10) === phoneDigits ||
          (v.email && (c.email || '').toLowerCase() === v.email.trim().toLowerCase()))
    )
    if (dup) return toast.error(`A customer with this phone or email already exists (${dup.name}).`)
    const line1 = (v.line1 || '').trim()
    const data = {
      name: v.name.trim(), phone: `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`, email: (v.email || '').trim(),
      address: { line1, street: line1, line2: (v.line2 || '').trim(), city: (v.city || '').trim(), state: v.state || 'Tamil Nadu', pincode: (v.pincode || '').trim() },
      status: v.status, notes: (v.notes || '').trim(), whatsappOptIn: !!v.whatsappOptIn,
      tags: (v.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    }
    let saved
    if (customer) { updateItem('customers', customer.id, data); saved = { ...customer, ...data }; logActivity('customer', `Customer updated: ${data.name}`) }
    else { saved = createItem('customers', data, 'c'); logActivity('customer', `Customer added: ${data.name}`) }
    toast.success(customer ? 'Customer updated' : 'Customer added')
    onSaved?.(saved)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? 'Edit Customer' : 'Add Customer'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="customer-form" loading={isSubmitting}>{customer ? 'Save Changes' : 'Add Customer'}</Button></>}>
      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" required error={errors.name} htmlFor="c-name" className="sm:col-span-2">
          <Input id="c-name" error={errors.name} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })} />
        </Field>
        <Field label="Mobile Number" required error={errors.phone} htmlFor="c-phone">
          <Input id="c-phone" inputMode="tel" placeholder="98765 43210" error={errors.phone} {...register('phone', { required: 'Mobile number is required', validate: (x) => /^[6-9]\d{9}$/.test(x.replace(/\D/g, '').slice(-10)) && x.replace(/\D/g, '').length >= 10 || 'Enter a valid 10-digit Indian mobile number' })} />
        </Field>
        <Field label="Email" error={errors.email} htmlFor="c-email">
          <Input id="c-email" type="email" error={errors.email} {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
        </Field>
        <Field label="Address" htmlFor="c-line1" className="sm:col-span-2"><Input id="c-line1" placeholder="Door no., street" {...register('line1')} /></Field>
        <Field label="City" required error={errors.city} htmlFor="c-city"><Input id="c-city" error={errors.city} {...register('city', { required: 'City is required' })} /></Field>
        <Field label="State" htmlFor="c-state"><Select id="c-state" options={INDIAN_STATES} {...register('state')} /></Field>
        <Field label="Pincode" error={errors.pincode} htmlFor="c-pin"><Input id="c-pin" inputMode="numeric" maxLength={6} error={errors.pincode} {...register('pincode', { pattern: { value: /^\d{6}$/, message: 'Pincode must be 6 digits' } })} /></Field>
        <Field label="Status" htmlFor="c-status"><Select id="c-status" options={['Active', 'Inactive']} {...register('status')} /></Field>
        <Field label="Tags" hint="Comma separated, e.g. Wholesale, Repeat" htmlFor="c-tags" className="sm:col-span-2"><Input id="c-tags" {...register('tags')} /></Field>
        <Field label="Notes" htmlFor="c-notes" className="sm:col-span-2"><Textarea id="c-notes" {...register('notes')} /></Field>
        <Checkbox label="Customer agreed to receive WhatsApp updates" className="sm:col-span-2" {...register('whatsappOptIn')} />
      </form>
    </Modal>
  )
}

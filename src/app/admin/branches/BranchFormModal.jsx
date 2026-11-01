import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, getState, logActivity, updateItem, useDb } from '@admin/_lib/store'
import { INDIAN_STATES } from '@admin/customers/CustomerFormModal'

const empty = { name: '', code: '', address: '', city: '', state: 'Tamil Nadu', pincode: '', phone: '', email: '', manager: '', status: 'Active' }
const digits = (s = '') => s.replace(/\D/g, '')
const formatPhone = (s) => { const d = digits(s).slice(-10); return `+91 ${d.slice(0, 5)} ${d.slice(5)}` }

/** Add / edit a branch. `branch` null → create. */
export default function BranchFormModal({ open, onClose, branch, onSaved }) {
  const toast = useToast()
  const db = useDb()
  const managers = useMemo(() => [...new Set([...db.settings.users.map((u) => u.name), ...db.branches.map((b) => b.manager)].filter(Boolean))].sort(), [db.settings.users, db.branches])
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: empty })
  useEffect(() => { if (open) reset(branch ? { ...empty, ...branch, phone: branch.phone || '' } : empty) }, [open, branch, reset])

  const onSubmit = (v) => {
    const code = v.code.trim().toUpperCase()
    const dup = getState().branches.find((b) => b.id !== branch?.id && b.code.toUpperCase() === code)
    if (dup) return toast.error(`Branch code ${code} is already used by ${dup.name}.`)
    const data = {
      name: v.name.trim(), code, address: v.address.trim(), city: v.city.trim(), state: v.state, pincode: v.pincode.trim(),
      phone: formatPhone(v.phone), email: v.email.trim().toLowerCase(), manager: v.manager.trim(), status: v.status,
    }
    let saved
    if (branch) { updateItem('branches', branch.id, data); saved = { ...branch, ...data }; logActivity('branch', `Branch updated: ${data.name}`) }
    else { saved = createItem('branches', data, 'br'); logActivity('branch', `Branch added: ${data.name}`) }
    toast.success(branch ? 'Branch updated' : 'Branch added')
    onSaved?.(saved)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={branch ? 'Edit Branch' : 'Add Branch'} subtitle={branch ? branch.code : 'Create a new store or warehouse location'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="branch-form" loading={isSubmitting}>{branch ? 'Update Branch' : 'Add Branch'}</Button></>}>
      <form id="branch-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch Name" required error={errors.name} htmlFor="b-name">
          <Input id="b-name" error={errors.name} placeholder="e.g. Reshmam – Madurai" {...register('name', { required: 'Branch name is required', minLength: { value: 3, message: 'Name is too short' } })} />
        </Field>
        <Field label="Branch Code" required error={errors.code} hint="Unique, uppercase letters/numbers (e.g. MD001)" htmlFor="b-code">
          <Input id="b-code" error={errors.code} className="uppercase" maxLength={10} placeholder="MD001"
            {...register('code', {
              required: 'Branch code is required',
              onChange: (e) => setValue('code', e.target.value.toUpperCase().replace(/\s/g, '')),
              validate: (x) => /^[A-Z0-9-]{3,10}$/.test(x.trim().toUpperCase()) || '3–10 characters: A–Z, 0–9 or hyphen',
            })} />
        </Field>
        <Field label="Address" required error={errors.address} htmlFor="b-address" className="sm:col-span-2">
          <Textarea id="b-address" rows={2} error={errors.address} placeholder="Door no., street, area" {...register('address', { required: 'Address is required' })} />
        </Field>
        <Field label="City" required error={errors.city} htmlFor="b-city"><Input id="b-city" error={errors.city} {...register('city', { required: 'City is required' })} /></Field>
        <Field label="State" htmlFor="b-state"><Select id="b-state" options={INDIAN_STATES} {...register('state')} /></Field>
        <Field label="Pincode" required error={errors.pincode} htmlFor="b-pin">
          <Input id="b-pin" inputMode="numeric" maxLength={6} error={errors.pincode} {...register('pincode', { required: 'Pincode is required', pattern: { value: /^[1-9]\d{5}$/, message: 'Pincode must be 6 digits' } })} />
        </Field>
        <Field label="Contact Number" required error={errors.phone} htmlFor="b-phone">
          <Input id="b-phone" inputMode="tel" placeholder="98765 43210" error={errors.phone}
            {...register('phone', { required: 'Contact number is required', validate: (x) => (digits(x).length >= 10 && /^[6-9]\d{9}$/.test(digits(x).slice(-10))) || 'Enter a valid 10-digit Indian mobile number' })} />
        </Field>
        <Field label="Email" required error={errors.email} htmlFor="b-email">
          <Input id="b-email" type="email" error={errors.email} {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
        </Field>
        <Field label="Branch Manager" required error={errors.manager} htmlFor="b-manager">
          <Input id="b-manager" list="b-manager-list" error={errors.manager} {...register('manager', { required: 'Manager name is required' })} />
          <datalist id="b-manager-list">{managers.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Status" htmlFor="b-status"><Select id="b-status" options={['Active', 'Inactive']} {...register('status')} /></Field>
      </form>
    </Modal>
  )
}

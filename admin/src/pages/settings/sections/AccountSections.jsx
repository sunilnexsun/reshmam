import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Avatar, Badge, Field, ImageUploader, Input, useToast } from '../../../components/ui'
import { getState, logActivity, updateItem, useDb } from '../../../services/store'
import { useAuth } from '../../../services/auth'
import { dateTime } from '../../../utils/format'
import { FormCard, SecretInput } from '../common'
import PasswordStrength from '../PasswordStrength'
import { validatePassword } from '../passwordRules'

const pickProfile = (u) => ({ name: u?.name || '', email: u?.email || '', phone: u?.phone || '', avatar: u?.avatar || '' })

export function ProfileSettings() {
  const { user, role } = useAuth()
  const db = useDb()
  const toast = useToast()
  const { register, control, handleSubmit, reset, watch, formState: { errors, isDirty, isSubmitting } } = useForm({ defaultValues: pickProfile(user) })
  useEffect(() => { reset(pickProfile(user)) }, [user, reset])
  if (!user) return null
  const branch = user.branchId === 'all' ? 'All branches' : db.branches.find((b) => b.id === user.branchId)?.name || '—'

  const onSave = (v) => {
    const email = v.email.trim().toLowerCase()
    if (getState().settings.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) return toast.error('Another user already has this email address.')
    updateItem('settings.users', user.id, { name: v.name.trim(), email, phone: v.phone.trim(), avatar: v.avatar })
    logActivity('settings', 'Admin profile updated')
    toast.success('Profile saved')
  }
  return (
    <FormCard title="Admin Profile" subtitle="Your personal details shown in the admin panel" id="set-profile" onSubmit={handleSubmit(onSave)} isDirty={isDirty} isSubmitting={isSubmitting} onReset={() => reset(pickProfile(user))}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={watch('name')} src={watch('avatar')} size={72} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{watch('name') || user.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted"><Badge tone="primary">{user.role}</Badge><span>{branch}</span><span>Last login {user.lastLogin ? dateTime(user.lastLogin) : '—'}</span></div>
          {role?.description && <p className="mt-1 text-xs text-muted">{role.description}</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <Field label="Full Name" required error={errors.name} htmlFor="pf-name"><Input id="pf-name" autoComplete="name" error={errors.name} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })} /></Field>
        <Field label="Email" required error={errors.email} htmlFor="pf-email" hint="Used to sign in"><Input id="pf-email" type="email" autoComplete="email" error={errors.email} {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} /></Field>
        <Field label="Phone" error={errors.phone} htmlFor="pf-phone"><Input id="pf-phone" inputMode="tel" autoComplete="tel" error={errors.phone} {...register('phone', { pattern: { value: /^\+?[\d\s-]{10,16}$/, message: 'Enter a valid phone number' } })} /></Field>
        <div className="sm:col-span-2">
          <p className="label">Profile photo</p>
          <div className="max-w-md"><Controller control={control} name="avatar" render={({ field }) => <ImageUploader images={field.value ? [field.value] : []} max={1} onChange={(imgs) => field.onChange(imgs[0] || '')} onError={(m) => toast.error(m)} />} /></div>
        </div>
      </div>
    </FormCard>
  )
}

export function PasswordSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const { register, handleSubmit, reset, watch, setError, formState: { errors, isDirty, isSubmitting } } = useForm({ defaultValues: { current: '', next: '', confirm: '' } })
  if (!user) return null
  const next = watch('next')
  const onSave = (v) => {
    const fresh = getState().settings.users.find((u) => u.id === user.id)
    if (fresh?.password !== v.current) return setError('current', { message: 'Current password is incorrect' }, { shouldFocus: true })
    updateItem('settings.users', user.id, { password: v.next, passwordChangedAt: new Date().toISOString() })
    logActivity('settings', `Password changed for ${user.name}`)
    reset({ current: '', next: '', confirm: '' })
    toast.success('Password changed')
  }
  return (
    <FormCard title="Change Password" subtitle={`Signed in as ${user.email}`} id="set-password" onSubmit={handleSubmit(onSave)} isDirty={isDirty} isSubmitting={isSubmitting}
      footerNote="Demo only: passwords are kept in browser storage. The backend must hash passwords (bcrypt/argon2) and handle resets.">
      <div className="grid max-w-lg gap-4">
        <input type="text" autoComplete="username" value={user.email} readOnly hidden />
        <Field label="Current password" required error={errors.current} htmlFor="pw-cur"><SecretInput id="pw-cur" autoComplete="current-password" error={errors.current} {...register('current', { required: 'Enter your current password' })} /></Field>
        <Field label="New password" required error={errors.next} htmlFor="pw-new">
          <SecretInput id="pw-new" autoComplete="new-password" error={errors.next} {...register('next', { required: 'Enter a new password', validate: { rules: validatePassword, differs: (x, all) => x !== all.current || 'New password must be different from the current one' } })} />
          <PasswordStrength value={next} />
        </Field>
        <Field label="Confirm new password" required error={errors.confirm} htmlFor="pw-confirm"><SecretInput id="pw-confirm" autoComplete="new-password" error={errors.confirm} {...register('confirm', { required: 'Confirm the new password', validate: (x, all) => x === all.next || 'Passwords do not match' })} /></Field>
      </div>
    </FormCard>
  )
}

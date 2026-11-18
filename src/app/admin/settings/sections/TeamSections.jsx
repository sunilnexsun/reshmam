import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { KeyRound, Lock, Pencil, ShieldCheck, Trash2, UserPlus, Wand2 } from 'lucide-react'
import { Avatar, Badge, Button, Card, DataTable, Field, FilterSelect, IconButton, Input, Modal, SearchInput, Segmented, Select, StatusBadge, Textarea, useConfirm, useToast } from '@admin/_components/ui'
import { createItem, getState, logActivity, removeItem, updateItem, updateSection, useDb } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { PERMISSION_MODULES } from '@admin/_lib/seed'
import { cn, dateTime } from '@admin/_lib/format'
import { CopyButton, SecretInput } from '@admin/settings/common'
import PasswordStrength from '@admin/settings/PasswordStrength'
import { generatePassword, validatePassword } from '@admin/settings/passwordRules'

const MODULE_LABELS = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', prices: 'Price Management', inventory: 'Inventory', branches: 'Branches', customers: 'Customers', marketing: 'Coupons', whatsapp: 'WhatsApp Automation', chatbot: 'AI Chatbot', reports: 'Reports', settings: 'Settings' }
const LEVELS = [{ value: 'none', label: 'None' }, { value: 'view', label: 'View' }, { value: 'manage', label: 'Manage' }]
const emptyUser = (role) => ({ name: '', email: '', phone: '', role, branchId: 'all', status: 'Active', password: '' })
const activeAdmins = (users, exceptId) => users.filter((u) => u.role === 'Admin' && u.status === 'Active' && u.id !== exceptId).length
// Settings "manage" lets Managers run the team, but only an Admin may create Admins, touch an Admin's account
// or change role permissions — otherwise anyone with settings access could make themselves an Admin.
const isAdmin = (u) => u?.role === 'Admin'

function UserFormModal({ user, onClose }) {
  const db = useDb()
  const toast = useToast()
  const { user: me } = useAuth()
  const isNew = user === null
  const roles = Object.keys(db.settings.roles).filter((r) => r !== 'Admin' || isAdmin(me))
  const defaultRole = roles.includes('Staff') ? 'Staff' : roles[0]
  const ownAccount = !!user && user.id === me?.id
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: emptyUser(defaultRole) })
  useEffect(() => { if (user !== undefined) reset(user ? { ...emptyUser(defaultRole), ...user, password: '' } : emptyUser(defaultRole)) }, [user, reset, defaultRole])
  const password = watch('password')

  const onSubmit = (v) => {
    const s = getState()
    const email = v.email.trim().toLowerCase()
    if (s.settings.users.some((u) => u.id !== user?.id && u.email.toLowerCase() === email)) return toast.error('A user with this email already exists.')
    if (user && user.role === 'Admin' && user.status === 'Active' && (v.role !== 'Admin' || v.status !== 'Active') && activeAdmins(s.settings.users, user.id) === 0) return toast.error('There must be at least one active Admin. Promote another user first.')
    if (user && user.id === me?.id && v.status !== 'Active') return toast.error('You cannot deactivate your own account.')
    if (!isAdmin(me) && (v.role === 'Admin' || isAdmin(user))) return toast.error('Only an Admin can create or change Admin accounts.')
    if (ownAccount && !isAdmin(me) && v.role !== user.role) return toast.error('You cannot change your own role.')
    const data = { name: v.name.trim(), email, phone: v.phone.trim(), role: v.role, branchId: v.branchId, status: v.status }
    if (isNew) { createItem('settings.users', { ...data, password: v.password, lastLogin: '', avatar: '' }, 'u'); logActivity('settings', `User added: ${data.name} (${data.role})`) }
    else { updateItem('settings.users', user.id, data); logActivity('settings', `User updated: ${data.name}`) }
    toast.success(isNew ? 'User added' : 'User updated')
    onClose()
  }
  return (
    <Modal open={user !== undefined} onClose={onClose} title={isNew ? 'Add User' : 'Edit User'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="user-form" loading={isSubmitting}>{isNew ? 'Add User' : 'Save Changes'}</Button></>}>
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" required error={errors.name} htmlFor="u-name"><Input id="u-name" error={errors.name} {...register('name', { required: 'Name is required' })} /></Field>
        <Field label="Email" required error={errors.email} htmlFor="u-email"><Input id="u-email" type="email" autoComplete="off" error={errors.email} {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} /></Field>
        <Field label="Phone" error={errors.phone} htmlFor="u-phone"><Input id="u-phone" inputMode="tel" error={errors.phone} {...register('phone', { pattern: { value: /^\+?[\d\s-]{10,16}$/, message: 'Enter a valid phone number' } })} /></Field>
        <Field label="Role" htmlFor="u-role" hint={ownAccount && !isAdmin(me) ? 'You cannot change your own role' : undefined}>
          {ownAccount && !isAdmin(me) ? <Input id="u-role" value={user.role} readOnly className="bg-surface text-muted" /> : <Select id="u-role" options={roles} {...register('role')} />}
        </Field>
        <Field label="Branch" htmlFor="u-branch" hint="Limits which branch the user works in"><Select id="u-branch" options={[{ value: 'all', label: 'All branches' }, ...db.branches.map((b) => ({ value: b.id, label: b.name }))]} {...register('branchId')} /></Field>
        <Field label="Status" htmlFor="u-status"><Select id="u-status" options={['Active', 'Inactive']} {...register('status')} /></Field>
        {isNew && (
          <Field label="Temporary password" required error={errors.password} htmlFor="u-pass" className="sm:col-span-2">
            <div className="flex gap-2">
              <div className="min-w-0 flex-1"><SecretInput id="u-pass" autoComplete="new-password" error={errors.password} {...register('password', { required: 'Set a temporary password', validate: validatePassword })} /></div>
              <Button variant="outline" icon={Wand2} onClick={() => setValue('password', generatePassword(), { shouldValidate: true })}>Generate</Button>
            </div>
            <PasswordStrength value={password} />
          </Field>
        )}
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }) {
  const toast = useToast()
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ defaultValues: { password: '' } })
  useEffect(() => { if (user) reset({ password: generatePassword() }) }, [user, reset])
  const password = watch('password')
  const onSubmit = (v) => {
    updateItem('settings.users', user.id, { password: v.password, passwordChangedAt: new Date().toISOString() })
    logActivity('settings', `Password reset for ${user.name}`)
    toast.success(`Password reset for ${user.name}. Share it securely.`)
    onClose()
  }
  return (
    <Modal open={!!user} onClose={onClose} title="Reset password" subtitle={user ? `${user.name} · ${user.email}` : ''} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="reset-form" icon={KeyRound}>Set new password</Button></>}>
      <form id="reset-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field label="New temporary password" required error={errors.password} htmlFor="rp-pass">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1"><SecretInput id="rp-pass" autoComplete="new-password" error={errors.password} {...register('password', { required: 'Enter a password', validate: validatePassword })} /></div>
            <div className="flex gap-2"><Button variant="outline" icon={Wand2} onClick={() => setValue('password', generatePassword(), { shouldValidate: true })}>Generate</Button>{password && <CopyButton value={password} ariaLabel="Copy password" />}</div>
          </div>
          <PasswordStrength value={password} />
        </Field>
        <p className="text-xs text-muted">Ask the user to change it after signing in. With the backend connected, this will instead email a one-time reset link.</p>
      </form>
    </Modal>
  )
}

export function UsersSettings({ canEdit }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('all')
  const [editing, setEditing] = useState(undefined)
  const [resetting, setResetting] = useState(null)
  const users = db.settings.users
  const branchName = (id) => (id === 'all' ? 'All branches' : db.branches.find((b) => b.id === id)?.name || '—')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return users.filter((u) => (role === 'all' || u.role === role) && (!s || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(s)))
  }, [users, q, role])

  const onDelete = async (u) => {
    if (u.id === me?.id) return toast.error('You cannot delete your own account.')
    if (u.role === 'Admin' && activeAdmins(users, u.id) === 0) return toast.error('You cannot delete the last active Admin.')
    if (!(await confirm({ title: 'Delete user?', message: `Delete ${u.name} (${u.email})? They will no longer be able to sign in.`, confirmText: 'Delete' }))) return
    removeItem('settings.users', u.id)
    logActivity('settings', `User deleted: ${u.name}`)
    toast.success('User deleted')
  }

  const columns = [
    { key: 'name', label: 'User', sortable: true, render: (u) => (
      <div className="flex items-center gap-3"><Avatar name={u.name} src={u.avatar} size={34} /><div className="min-w-0"><p className="font-medium text-ink">{u.name}{u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}</p><p className="truncate text-xs text-muted">{u.email}</p></div></div>
    ) },
    { key: 'role', label: 'Role', sortable: true, render: (u) => <Badge tone={u.role === 'Admin' ? 'primary' : u.role === 'Manager' ? 'blue' : 'gray'}>{u.role}</Badge> },
    { key: 'branchId', label: 'Branch', render: (u) => <span className="whitespace-nowrap">{branchName(u.branchId)}</span> },
    { key: 'lastLogin', label: 'Last login', sortable: true, render: (u) => <span className="whitespace-nowrap">{u.lastLogin ? dateTime(u.lastLogin) : 'Never'}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (u) => <StatusBadge status={u.status} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: (u) => canEdit && (isAdmin(me) || !isAdmin(u)) ? (
      <div className="flex justify-end gap-1">
        <IconButton icon={Pencil} size="sm" variant="primary" label={`Edit ${u.name}`} onClick={() => setEditing(u)} />
        <IconButton icon={KeyRound} size="sm" label={`Reset password for ${u.name}`} onClick={() => setResetting(u)} />
        <IconButton icon={Trash2} size="sm" variant="danger" label={`Delete ${u.name}`} onClick={() => onDelete(u)} disabled={u.id === me?.id} />
      </div>
    ) : null },
  ]

  return (
    <Card title="User Management" subtitle={`${users.length} admin panel users`} bodyClassName="p-0" actions={canEdit && <Button icon={UserPlus} onClick={() => setEditing(null)}>Add User</Button>}>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email" className="sm:w-72" />
        <FilterSelect label="Role" value={role} onChange={setRole} allLabel="All Roles" options={Object.keys(db.settings.roles)} className="sm:ml-auto" />
      </div>
      <DataTable columns={columns} rows={rows} initialSort={{ key: 'name', dir: 'asc' }} />
      <UserFormModal user={editing} onClose={() => setEditing(undefined)} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </Card>
  )
}

export function RolesSettings({ canEdit: canManageSettings }) {
  const { user: me } = useAuth()
  const canEdit = canManageSettings && isAdmin(me)
  const db = useDb()
  const toast = useToast()
  const roles = db.settings.roles
  const names = Object.keys(roles)
  const [active, setActive] = useState(names.includes('Manager') ? 'Manager' : names[0])
  const [draft, setDraft] = useState(null) // { [role]: {description, permissions} } with edits
  const value = draft || roles
  const role = value[active]
  const locked = active === 'Admin'
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(roles)
  const userCount = (r) => db.settings.users.filter((u) => u.role === r).length

  const setPerm = (m, lvl) => setDraft({ ...value, [active]: { ...role, permissions: { ...role.permissions, [m]: lvl } } })
  const setAll = (lvl) => setDraft({ ...value, [active]: { ...role, permissions: Object.fromEntries(PERMISSION_MODULES.map((m) => [m, lvl])) } })
  const save = () => {
    const next = { ...draft, Admin: { ...draft.Admin, permissions: Object.fromEntries(PERMISSION_MODULES.map((m) => [m, 'manage'])) } }
    updateSection('settings.roles', next)
    logActivity('settings', 'Role permissions updated')
    toast.success('Permissions saved — they apply immediately to signed-in users')
    setDraft(null)
  }

  return (
    <Card title="Roles & Permissions" subtitle={canManageSettings && !canEdit ? 'Only an Admin can change role permissions' : 'Control what each role can see (View) and change (Manage)'} bodyClassName="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <Segmented value={active} onChange={setActive} options={names.map((n) => ({ value: n, label: `${n} (${userCount(n)})` }))} size="md" />
        {canEdit && !locked && (
          <div className="flex gap-1.5 sm:ml-auto">
            {LEVELS.map((l) => <Button key={l.value} size="sm" variant="outline" onClick={() => setAll(l.value)}>All {l.label}</Button>)}
          </div>
        )}
      </div>
      <div className="p-4">
        {locked ? <p className="mb-3 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs font-medium text-primary"><Lock className="h-4 w-4" />Admin always has full Manage access so the panel can never be locked out.</p> : (
          <Field label="Role description" htmlFor="role-desc" className="mb-4">
            <Textarea id="role-desc" rows={2} disabled={!canEdit} value={role.description || ''} onChange={(e) => setDraft({ ...value, [active]: { ...role, description: e.target.value } })} />
          </Field>
        )}
        <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Permissions for {active}</caption>
            <thead className="bg-surface/60"><tr><th scope="col" className="th px-3 sm:px-4">Module</th>{LEVELS.map((l) => <th key={l.value} scope="col" className="w-16 px-1 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted sm:w-24">{l.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {PERMISSION_MODULES.map((m) => {
                const cur = locked ? 'manage' : role.permissions?.[m] || 'none'
                return (
                  <tr key={m} className="hover:bg-surface/50">
                    <th scope="row" className="px-3 py-2.5 text-left font-medium sm:px-4">{MODULE_LABELS[m] || m}</th>
                    {LEVELS.map((l) => (
                      <td key={l.value} className="px-1 py-1.5 text-center">
                        <label className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full', cur === l.value && (l.value === 'none' ? 'bg-gray-100' : l.value === 'view' ? 'bg-blue-50' : 'bg-accent-soft'), canEdit && !locked && 'cursor-pointer hover:bg-surface')}>
                          <input type="radio" name={`perm-${active}-${m}`} value={l.value} checked={cur === l.value} disabled={!canEdit || locked} onChange={() => setPerm(m, l.value)}
                            aria-label={`${MODULE_LABELS[m]}: ${l.label}`} className="h-4 w-4 accent-[#16a34a]" />
                        </label>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted"><ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />“None” hides the module from the sidebar. The backend must enforce the same permissions on its API.</p>
      </div>
      {canEdit && (
        <div className="flex flex-col-reverse gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={!dirty} onClick={() => setDraft(null)}>Discard</Button><Button disabled={!dirty} onClick={save}>Save Changes</Button></div>
        </div>
      )}
    </Card>
  )
}

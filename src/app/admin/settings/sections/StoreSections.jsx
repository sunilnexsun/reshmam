import { useState } from 'react'
import { Building2, ImageOff } from 'lucide-react'
import { Button, Card, Checkbox, Field, ImageUploader, Input, Select, Textarea, useToast } from '@admin/_components/ui'
import { logActivity, updateSection, useDb } from '@admin/_lib/store'
import { INDIAN_STATES } from '@admin/customers/CustomerFormModal'
import { FormCard, ToggleField } from '@admin/settings/common'
import { useSectionForm } from '@admin/settings/useSectionForm'

const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function GeneralSettings({ canEdit }) {
  const db = useDb()
  const { register, control, onSubmit, discard, formState: { errors, isDirty, isSubmitting } } = useSectionForm('settings.general', db.settings.general, { label: 'General settings', transform: (v) => ({ ...v, storeName: v.storeName.trim(), orderPrefix: v.orderPrefix.trim().toUpperCase() }) })
  return (
    <FormCard title="General Settings" subtitle="Store identity, regional formats and order numbering" id="set-general" onSubmit={onSubmit} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canEdit} onReset={discard}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Store Name" required error={errors.storeName} htmlFor="g-name"><Input id="g-name" error={errors.storeName} {...register('storeName', { required: 'Store name is required' })} /></Field>
        <Field label="Store URL" error={errors.storeUrl} htmlFor="g-url"><Input id="g-url" type="url" error={errors.storeUrl} {...register('storeUrl', { pattern: { value: URL_RE, message: 'Enter a full URL, e.g. https://reshmam.com' } })} /></Field>
        <Field label="Timezone" htmlFor="g-tz"><Select id="g-tz" options={['Asia/Kolkata']} {...register('timezone')} /></Field>
        <Field label="Currency" htmlFor="g-cur" hint="Prices are stored in Indian Rupees"><Select id="g-cur" options={[{ value: 'INR', label: 'INR – Indian Rupee (₹)' }]} {...register('currency')} /></Field>
        <Field label="Date Format" htmlFor="g-date"><Select id="g-date" options={['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} {...register('dateFormat')} /></Field>
        <Field label="Order Number Prefix" error={errors.orderPrefix} htmlFor="g-prefix" hint="e.g. RSH- → RSH-10234"><Input id="g-prefix" className="uppercase" maxLength={8} error={errors.orderPrefix} {...register('orderPrefix', { required: 'Prefix is required', pattern: { value: /^[A-Za-z]{2,6}-?$/, message: '2–6 letters, optional hyphen' } })} /></Field>
        <div className="space-y-4 border-t border-line pt-4 sm:col-span-2">
          <ToggleField control={control} name="lowStockEmail" label="Email low-stock summary" description="Daily email to admins when items fall below alert level (sent by the backend)" disabled={!canEdit} />
          <ToggleField control={control} name="maintenance" label="Maintenance mode" description="Show a “we'll be back soon” page on the storefront" disabled={!canEdit} />
        </div>
      </div>
    </FormCard>
  )
}

export function CompanySettings({ canEdit }) {
  const db = useDb()
  const { register, onSubmit, discard, formState: { errors, isDirty, isSubmitting } } = useSectionForm('settings.company', db.settings.company, { label: 'Company information', transform: (v) => ({ ...v, gstin: v.gstin.trim().toUpperCase() }) })
  return (
    <FormCard title="Company Information" subtitle="Printed on invoices, emails and the storefront footer" id="set-company" onSubmit={onSubmit} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canEdit} onReset={discard}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Legal Name" required error={errors.legalName} htmlFor="co-legal"><Input id="co-legal" error={errors.legalName} {...register('legalName', { required: 'Legal name is required' })} /></Field>
        <Field label="Brand Name" required error={errors.brand} htmlFor="co-brand"><Input id="co-brand" error={errors.brand} {...register('brand', { required: 'Brand name is required' })} /></Field>
        <Field label="Tagline" htmlFor="co-tag" className="sm:col-span-2"><Input id="co-tag" {...register('tagline')} /></Field>
        <Field label="Address" required error={errors.address} htmlFor="co-addr" className="sm:col-span-2"><Textarea id="co-addr" rows={2} error={errors.address} {...register('address', { required: 'Address is required' })} /></Field>
        <Field label="City" required error={errors.city} htmlFor="co-city"><Input id="co-city" error={errors.city} {...register('city', { required: 'City is required' })} /></Field>
        <Field label="State" htmlFor="co-state"><Select id="co-state" options={INDIAN_STATES} {...register('state')} /></Field>
        <Field label="Pincode" error={errors.pincode} htmlFor="co-pin"><Input id="co-pin" inputMode="numeric" maxLength={6} error={errors.pincode} {...register('pincode', { pattern: { value: /^[1-9]\d{5}$/, message: 'Pincode must be 6 digits' } })} /></Field>
        <Field label="Phone" error={errors.phone} htmlFor="co-phone"><Input id="co-phone" inputMode="tel" error={errors.phone} {...register('phone', { pattern: { value: /^\+?[\d\s-]{10,16}$/, message: 'Enter a valid phone number' } })} /></Field>
        <Field label="Mobile / WhatsApp" error={errors.mobile} htmlFor="co-mobile"><Input id="co-mobile" inputMode="tel" error={errors.mobile} {...register('mobile', { pattern: { value: /^\+?[\d\s-]{10,16}$/, message: 'Enter a valid mobile number' } })} /></Field>
        <Field label="Email" required error={errors.email} htmlFor="co-email"><Input id="co-email" type="email" error={errors.email} {...register('email', { required: 'Email is required', pattern: { value: EMAIL_RE, message: 'Enter a valid email' } })} /></Field>
        <Field label="GSTIN" error={errors.gstin} htmlFor="co-gstin" hint="15 characters, e.g. 33AAAAA0000A1Z5"><Input id="co-gstin" className="uppercase" maxLength={15} error={errors.gstin} {...register('gstin', { validate: (x) => !x || /^[0-3]\d[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(x.trim().toUpperCase()) || 'Enter a valid 15-character GSTIN' })} /></Field>
        <Field label="FSSAI Licence No." error={errors.fssai} htmlFor="co-fssai" hint="14 digits"><Input id="co-fssai" inputMode="numeric" maxLength={14} error={errors.fssai} {...register('fssai', { pattern: { value: /^\d{14}$/, message: 'FSSAI licence number is 14 digits' } })} /></Field>
      </div>
    </FormCard>
  )
}

export function LogoSettings({ canEdit }) {
  const db = useDb()
  const toast = useToast()
  const saved = db.settings.company.logo
  const [logo, setLogo] = useState(null) // null = unchanged
  const current = logo ?? saved
  const dirty = logo !== null && logo !== saved
  const save = () => {
    updateSection('settings.company', { logo: current })
    logActivity('settings', current ? 'Business logo updated' : 'Business logo removed')
    toast.success(current ? 'Logo saved' : 'Logo removed')
    setLogo(null)
  }
  return (
    <Card title="Business Logo" subtitle="Used on invoices, emails and the storefront header" bodyClassName="p-0">
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          {canEdit ? <ImageUploader images={current ? [current] : []} max={1} onChange={(imgs) => setLogo(imgs[0] || '')} onError={(m) => toast.error(m)} /> : <p className="text-sm text-muted">You can view the logo but not change it.</p>}
          <p className="mt-3 text-xs text-muted">Use a square or wide PNG/WebP with a transparent background, at least 400 px wide. Stored in the browser for this demo; the backend will upload it to file storage.</p>
        </div>
        <div>
          <p className="label">Preview</p>
          <div className="space-y-3">
            <div className="flex h-20 items-center justify-center rounded-xl border border-line bg-white p-3">{current ? <img src={current} alt="Logo on light background" className="max-h-full max-w-full object-contain" /> : <span className="flex items-center gap-1.5 text-xs text-muted"><ImageOff className="h-4 w-4" />No logo uploaded</span>}</div>
            <div className="flex h-20 items-center justify-center rounded-xl bg-primary p-3">{current ? <img src={current} alt="Logo on dark background" className="max-h-full max-w-full object-contain" /> : <span className="flex items-center gap-1.5 text-xs text-white/70"><Building2 className="h-4 w-4" />{db.settings.company.brand}</span>}</div>
          </div>
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-col-reverse gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={!dirty} onClick={() => setLogo(null)}>Discard</Button><Button disabled={!dirty} onClick={save}>Save Changes</Button></div>
        </div>
      )}
    </Card>
  )
}

const NOTIFY = [
  ['newOrder', 'New order placed', 'When a customer places an order'],
  ['lowStock', 'Low stock', 'When a variant falls to its alert level'],
  ['outOfStock', 'Out of stock', 'When a variant reaches zero'],
  ['newCustomer', 'New customer', 'When someone registers on the store'],
  ['paymentFailed', 'Payment failed', 'When a Razorpay payment fails'],
  ['refundRequest', 'Refund / return request', 'When a customer asks for a refund or return'],
  ['dailySummary', 'Daily sales summary', 'A summary of yesterday’s orders and revenue'],
]
export function NotificationSettings({ canEdit }) {
  const db = useDb()
  const { register, control, onSubmit, discard, formState: { isDirty, isSubmitting } } = useSectionForm('settings.notifications', db.settings.notifications, { label: 'Notification settings' })
  return (
    <FormCard title="Notification Settings" subtitle="Choose which events alert the admin team, and how" id="set-notify" onSubmit={onSubmit} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canEdit} onReset={discard}>
      <ul className="divide-y divide-line">
        {NOTIFY.map(([k, label, desc]) => <li key={k} className="py-3 first:pt-0"><ToggleField control={control} name={k} label={label} description={desc} disabled={!canEdit} /></li>)}
      </ul>
      <fieldset className="mt-4 border-t border-line pt-4">
        <legend className="label pt-4">Channels</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox label="In-app (header bell)" {...register('channels.inApp')} />
          <Checkbox label="Email" {...register('channels.email')} />
          <Checkbox label="WhatsApp to admin number" {...register('channels.whatsapp')} />
        </div>
        <p className="mt-2 text-xs text-muted">Email and WhatsApp alerts are sent by the backend once email and the WhatsApp Cloud API are connected. In-app alerts work now.</p>
      </fieldset>
    </FormCard>
  )
}

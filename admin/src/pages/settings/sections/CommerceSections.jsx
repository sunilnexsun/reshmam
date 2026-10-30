import { ShieldAlert } from 'lucide-react'
import { Field, Input, Select } from '../../../components/ui'
import { useDb } from '../../../services/store'
import { INDIAN_STATES } from '../../customers/CustomerFormModal'
import { FormCard, ToggleField } from '../common'
import { useSectionForm } from '../useSectionForm'

const GSTIN_RE = /^[0-3]\d[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const GST_RATES = [0, 5, 12, 18, 28]
const numberRules = (label, min = 0, max) => ({ valueAsNumber: true, required: `${label} is required`, validate: (x) => (Number.isFinite(x) && x >= min && (max == null || x <= max)) || `${label} must be ${max == null ? `at least ${min}` : `between ${min} and ${max}`}` })

export function TaxSettings({ canEdit }) {
  const db = useDb()
  const { register, control, watch, onSubmit, discard, formState: { errors, isDirty, isSubmitting } } = useSectionForm('settings.tax', db.settings.tax, { label: 'Tax & GST settings', transform: (v) => ({ ...v, defaultGst: Number(v.defaultGst), gstin: v.gstin.trim().toUpperCase(), invoicePrefix: v.invoicePrefix.trim().toUpperCase() }) })
  const enabled = watch('gstEnabled')
  return (
    <FormCard title="Tax & GST" subtitle="Applied to product prices and printed on invoices" id="set-tax" onSubmit={onSubmit} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canEdit} onReset={discard}>
      <div className="space-y-4">
        <ToggleField control={control} name="gstEnabled" label="Charge GST" description="Calculate GST on orders and show it on invoices" disabled={!canEdit} />
        <ToggleField control={control} name="pricesIncludeTax" label="Prices include GST" description="Selling prices entered in the catalogue already include GST" disabled={!canEdit || !enabled} />
        <ToggleField control={control} name="hsnOnInvoice" label="Show HSN codes on invoices" disabled={!canEdit || !enabled} />
      </div>
      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <Field label="Default GST rate" htmlFor="t-gst" hint="Edible oils are typically 5% — confirm with your accountant"><Select id="t-gst" disabled={!enabled} options={GST_RATES.map((r) => ({ value: r, label: `${r}%` }))} {...register('defaultGst', { valueAsNumber: true })} /></Field>
        <Field label="GSTIN" required={enabled} error={errors.gstin} htmlFor="t-gstin" hint="15 characters: state code, PAN, entity no., Z, checksum">
          <Input id="t-gstin" className="uppercase" maxLength={15} placeholder="33AAAAA0000A1Z5" error={errors.gstin}
            {...register('gstin', { validate: (x, all) => (!all.gstEnabled && !x) || (x ? GSTIN_RE.test(x.trim().toUpperCase()) || 'Enter a valid 15-character GSTIN (e.g. 33AAAAA0000A1Z5)' : 'GSTIN is required when GST is charged') })} />
        </Field>
        <Field label="Place of supply (home state)" htmlFor="t-pos" hint="Same state → CGST + SGST, other states → IGST"><Select id="t-pos" options={INDIAN_STATES.filter((s) => s !== 'Other')} {...register('placeOfSupply')} /></Field>
        <Field label="Invoice number prefix" error={errors.invoicePrefix} htmlFor="t-inv"><Input id="t-inv" className="uppercase" maxLength={10} error={errors.invoicePrefix} {...register('invoicePrefix', { required: 'Prefix is required', pattern: { value: /^[A-Za-z0-9]{2,8}[-/]?$/, message: '2–8 letters/numbers, optional - or /' } })} /></Field>
      </div>
    </FormCard>
  )
}

export function PaymentSettings({ canEdit }) {
  const db = useDb()
  const { register, control, watch, onSubmit, discard, formState: { errors, isDirty, isSubmitting } } = useSectionForm('settings.payment', db.settings.payment, { label: 'Payment settings', transform: (v) => ({ ...v, razorpayKeyId: v.razorpayKeyId.trim(), codMaxOrder: Number(v.codMaxOrder) }) })
  const rzp = watch('razorpayEnabled')
  const cod = watch('codEnabled')
  return (
    <FormCard title="Payment Settings" subtitle="Razorpay online payments and Cash on Delivery" id="set-payment" onSubmit={onSubmit} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canEdit} onReset={discard}>
      <section className="space-y-4">
        <ToggleField control={control} name="razorpayEnabled" label="Razorpay (UPI, cards, net banking)" description="Accept online payments at checkout" disabled={!canEdit} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode" htmlFor="p-mode"><Select id="p-mode" disabled={!rzp} options={['Test', 'Live']} {...register('razorpayMode')} /></Field>
          <Field label="Key ID" required={rzp} error={errors.razorpayKeyId} htmlFor="p-key" hint="Public key — safe to use in the browser">
            <Input id="p-key" className="font-mono text-[13px]" disabled={!rzp} placeholder="rzp_test_XXXXXXXXXXXXXX" error={errors.razorpayKeyId}
              {...register('razorpayKeyId', { validate: (x, all) => {
                if (!all.razorpayEnabled) return true
                if (!x) return 'Key ID is required to enable Razorpay'
                if (!/^rzp_(test|live)_[A-Za-z0-9]{8,}$/.test(x.trim())) return 'Key ID must start with rzp_test_ or rzp_live_'
                const live = x.trim().startsWith('rzp_live_')
                return live === (all.razorpayMode === 'Live') || `This is a ${live ? 'live' : 'test'} key but mode is set to ${all.razorpayMode}`
              } })} />
          </Field>
        </div>
        <p className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
          <ShieldAlert className="mt-px h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>The Razorpay <b>Key Secret</b> and <b>Webhook Secret</b> are never entered here. Set them as server environment variables (e.g. <code className="font-mono">RAZORPAY_KEY_SECRET</code>, <code className="font-mono">RAZORPAY_WEBHOOK_SECRET</code>) — the backend creates orders, verifies payment signatures and processes refunds.</span>
        </p>
      </section>
      <section className="mt-5 space-y-4 border-t border-line pt-5">
        <ToggleField control={control} name="codEnabled" label="Cash on Delivery" description="Let customers pay when the order arrives" disabled={!canEdit} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maximum COD order value (₹)" error={errors.codMaxOrder} htmlFor="p-codmax" hint="Orders above this must be paid online">
            <Input id="p-codmax" type="number" min={0} step={1} disabled={!cod} error={errors.codMaxOrder} {...register('codMaxOrder', { ...numberRules('Maximum COD value', 1, 500000) })} />
          </Field>
          <Field label="UPI ID for manual payments (optional)" error={errors.upiId} htmlFor="p-upi"><Input id="p-upi" placeholder="reshmam@okaxis" error={errors.upiId} {...register('upiId', { pattern: { value: /^[\w.-]{2,}@[a-zA-Z]{2,}$/, message: 'Enter a valid UPI ID, e.g. name@bank' } })} /></Field>
        </div>
      </section>
    </FormCard>
  )
}

export function ShippingSettings({ canEdit }) {
  const db = useDb()
  const { register, control, watch, onSubmit, discard, formState: { errors, isDirty, isSubmitting } } = useSectionForm('settings.shipping', db.settings.shipping, { label: 'Shipping settings', transform: (v) => ({ ...v, freeThreshold: Number(v.freeThreshold), tamilNaduFee: Number(v.tamilNaduFee), restOfIndiaFee: Number(v.restOfIndiaFee), couriers: v.couriers.split(',').map((c) => c.trim()).filter(Boolean).join(', ') }) })
  const [free, tn, roi] = watch(['freeThreshold', 'tamilNaduFee', 'restOfIndiaFee'])
  return (
    <FormCard title="Shipping Settings" subtitle="Delivery charges and dispatch promises shown at checkout" id="set-shipping" onSubmit={onSubmit} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canEdit} onReset={discard}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Free shipping above (₹)" error={errors.freeThreshold} htmlFor="s-free"><Input id="s-free" type="number" min={0} error={errors.freeThreshold} {...register('freeThreshold', numberRules('Free shipping threshold', 0, 100000))} /></Field>
        <Field label="Tamil Nadu fee (₹)" error={errors.tamilNaduFee} htmlFor="s-tn"><Input id="s-tn" type="number" min={0} error={errors.tamilNaduFee} {...register('tamilNaduFee', numberRules('Tamil Nadu fee', 0, 5000))} /></Field>
        <Field label="Rest of India fee (₹)" error={errors.restOfIndiaFee} htmlFor="s-roi"><Input id="s-roi" type="number" min={0} error={errors.restOfIndiaFee} {...register('restOfIndiaFee', numberRules('Rest of India fee', 0, 5000))} /></Field>
        <Field label="Dispatch time" required error={errors.dispatchDays} htmlFor="s-days"><Input id="s-days" error={errors.dispatchDays} {...register('dispatchDays', { required: 'Dispatch time is required' })} /></Field>
        <Field label="Couriers" htmlFor="s-cour" hint="Comma separated" className="sm:col-span-2"><Input id="s-cour" {...register('couriers')} /></Field>
      </div>
      <div className="mt-5 border-t border-line pt-5"><ToggleField control={control} name="pickupAvailable" label="Store pickup" description="Allow customers to collect orders from a branch" disabled={!canEdit} /></div>
      {Number.isFinite(free) && <p className="mt-5 rounded-lg bg-surface px-3 py-2 text-xs text-muted">Checkout preview: orders of ₹{Number(free).toLocaleString('en-IN')} or more ship free; below that, ₹{tn || 0} within Tamil Nadu and ₹{roi || 0} elsewhere in India.</p>}
    </FormCard>
  )
}

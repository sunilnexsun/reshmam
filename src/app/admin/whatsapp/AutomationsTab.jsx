import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Bell, CreditCard, Gift, PackageCheck, Send, ShoppingCart, Truck, UserPlus, MessageSquareHeart, Zap } from 'lucide-react'
import { Badge, Button, DemoNote, Field, Input, Modal, StatusBadge, Toggle, useToast } from '@admin/_components/ui'
import { createItem, logActivity, updateItem, useDb } from '@admin/_lib/store'
import { cn } from '@admin/_lib/format'
import PhonePreview from './PhonePreview'
import { DELAYS, delayLabel, render, sampleValues } from './waUtils'

const ICONS = { order_confirmation: PackageCheck, order_shipped: Truck, order_delivered: Gift, payment_reminder: CreditCard, abandoned_cart: ShoppingCart, welcome: UserPlus, low_stock: Bell, follow_up: MessageSquareHeart }

function TestSendModal({ automation, template, onClose }) {
  const db = useDb()
  const toast = useToast()
  const samples = useMemo(() => sampleValues(db), [db])
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { phone: '' } })
  useEffect(() => { if (automation) reset({ phone: db.whatsapp.config.businessPhone || '' }) }, [automation, reset, db.whatsapp.config.businessPhone])
  if (!automation) return null

  const onSend = ({ phone }) => {
    const d = phone.replace(/\D/g, '').slice(-10)
    const message = [render(template.header, samples), render(template.body, samples), template.footer].filter(Boolean).join('\n')
    createItem('whatsapp.logs', { phone: `+91 ${d.slice(0, 5)} ${d.slice(5)}`, customer: 'Test recipient', template: template.name, message, date: new Date().toISOString(), status: 'Simulated', error: '', simulated: true, test: true }, 'wl')
    logActivity('whatsapp', `Test message simulated: ${automation.name}`)
    toast.info('Test logged as “Simulated”. No WhatsApp message was sent — the Cloud API is not connected.', { duration: 6000 })
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={`Send test · ${automation.name}`} subtitle={`Template: ${template.name}`} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="wa-test-form" icon={Send} loading={isSubmitting}>Send test (simulated)</Button></>}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <form id="wa-test-form" onSubmit={handleSubmit(onSend)} noValidate className="min-w-0 space-y-4">
          <Field label="Recipient WhatsApp number" required error={errors.phone} htmlFor="wa-test-phone" hint="10-digit Indian mobile number">
            <Input id="wa-test-phone" inputMode="tel" placeholder="98765 43210" error={errors.phone}
              {...register('phone', { required: 'Enter a phone number', validate: (x) => /^[6-9]\d{9}$/.test(x.replace(/\D/g, '').slice(-10)) || 'Enter a valid 10-digit Indian mobile number' })} />
          </Field>
          <div>
            <p className="label">Sample values used</p>
            <dl className="divide-y divide-line rounded-lg border border-line text-xs">
              {Object.entries(samples).filter(([k]) => `${template.header} ${template.body}`.includes(`{{${k}}}`)).map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3 px-3 py-1.5"><dt className="font-mono text-muted">{`{{${k}}}`}</dt><dd className="min-w-0 truncate text-right font-medium">{val}</dd></div>
              ))}
            </dl>
          </div>
          <DemoNote>This is a simulation: the message is rendered with mock data and added to Message Logs with status <b>Simulated</b>. Real delivery needs the backend to call <code className="font-mono">POST /{db.whatsapp.config.apiVersion}/&lt;phone-number-id&gt;/messages</code> on the WhatsApp Cloud API.</DemoNote>
        </form>
        <PhonePreview header={render(template.header, samples)} body={render(template.body, samples)} footer={template.footer} buttons={template.buttons} />
      </div>
    </Modal>
  )
}

export default function AutomationsTab({ canManage, masterEnabled }) {
  const db = useDb()
  const toast = useToast()
  const [testing, setTesting] = useState(null)
  const templates = db.whatsapp.templates
  const tplById = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates])

  const patch = (a, p, msg) => { updateItem('whatsapp.automations', a.id, p); toast.success(msg) }
  const onToggle = (a, enabled) => {
    updateItem('whatsapp.automations', a.id, { enabled })
    logActivity('whatsapp', `Automation ${enabled ? 'enabled' : 'disabled'}: ${a.name}`)
    const t = tplById[a.templateId]
    if (enabled && t && t.status !== 'Approved') toast.warning(`${a.name} enabled, but template “${t.name}” is ${t.status}. Meta only delivers approved templates.`, { duration: 6000 })
    else toast.success(`${a.name} ${enabled ? 'enabled' : 'disabled'}`)
  }

  return (
    <div className="p-4">
      {!masterEnabled && <DemoNote className="mb-4">WhatsApp automation is switched off at the top of this page, so none of these will run even if enabled.</DemoNote>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {db.whatsapp.automations.map((a) => {
          const Icon = ICONS[a.key] || Zap
          const t = tplById[a.templateId]
          return (
            <li key={a.id} className={cn('flex min-w-0 flex-col rounded-xl border bg-white p-4 transition', a.enabled ? 'border-accent/40' : 'border-line')}>
              <div className="flex items-start gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', a.enabled ? 'bg-accent-soft text-primary' : 'bg-surface text-muted')}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{a.name}</p>
                  <p className="text-xs text-muted">{a.description}</p>
                </div>
                <Toggle checked={a.enabled} onChange={(v) => onToggle(a, v)} disabled={!canManage} label={`${a.name} automation`} className="[&>label]:sr-only" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor={`tpl-${a.id}`} className="label">Template</label>
                  <select id={`tpl-${a.id}`} className="input h-9 text-[13px]" value={a.templateId || ''} disabled={!canManage}
                    onChange={(e) => patch(a, { templateId: e.target.value }, `${a.name}: template updated`)}>
                    <option value="">Select template…</option>
                    {templates.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.language}, {x.status})</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor={`delay-${a.id}`} className="label">Send</label>
                  <select id={`delay-${a.id}`} className="input h-9 text-[13px]" value={a.delay} disabled={!canManage}
                    onChange={(e) => patch(a, { delay: Number(e.target.value) }, `${a.name}: will send ${delayLabel(e.target.value).toLowerCase()}`)}>
                    {!DELAYS.some((d) => d.value === a.delay) && <option value={a.delay}>{delayLabel(a.delay)}</option>}
                    {DELAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {t ? <><span className="text-muted">Template</span><StatusBadge status={t.status} /></> : <Badge tone="red">No template</Badge>}
                  {t && t.status !== 'Approved' && <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />needs Meta approval</span>}
                </div>
                <Button size="sm" variant="outline" icon={Send} disabled={!t} onClick={() => setTesting(a)}>Send test</Button>
              </div>
            </li>
          )
        })}
      </ul>
      {testing && <TestSendModal automation={testing} template={tplById[testing.templateId]} onClose={() => setTesting(null)} />}
    </div>
  )
}

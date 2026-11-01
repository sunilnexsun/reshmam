import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, CircleAlert, KeyRound, PlugZap, RefreshCw, ShieldAlert, Unplug, XCircle } from 'lucide-react'
import { Button, Card, DemoNote, Field, Input, Select, StatusBadge, Toggle, useToast } from '@admin/_components/ui'
import { logActivity, updateSection } from '@admin/_lib/store'
import { cn, dateTime } from '@admin/_lib/format'
import { CopyButton, FormCard, SecretInput } from '@admin/settings/common'
import { randomToken } from '@admin/settings/secrets'

const API_VERSIONS = ['v23.0', 'v22.0', 'v21.0', 'v20.0', 'v19.0']
const pick = (c) => ({ phoneNumberId: c.phoneNumberId || '', wabaId: c.wabaId || '', businessPhone: c.businessPhone || '', accessToken: c.accessToken || '', apiVersion: c.apiVersion || 'v21.0', verifyToken: c.verifyToken || '' })

function checks(v, webhookUrl) {
  return [
    { label: 'Phone Number ID', ok: /^\d{10,20}$/.test(v.phoneNumberId), msg: v.phoneNumberId ? 'Should be 10–20 digits (from Meta → WhatsApp → API Setup)' : 'Missing' },
    { label: 'WhatsApp Business Account ID', ok: /^\d{10,20}$/.test(v.wabaId), msg: v.wabaId ? 'Should be 10–20 digits' : 'Missing' },
    { label: 'Business phone number', ok: /^\+?\d[\d\s-]{9,16}$/.test(v.businessPhone), msg: v.businessPhone ? 'Use international format, e.g. +91 98765 43210' : 'Missing' },
    { label: 'Access token', ok: v.accessToken.length >= 50, warn: v.accessToken && !v.accessToken.startsWith('EAA'), msg: v.accessToken ? 'Looks too short for a Meta access token' : 'Missing', warnMsg: 'Meta tokens usually start with “EAA” — double-check it' },
    { label: 'Verify token', ok: v.verifyToken.length >= 16, msg: v.verifyToken ? 'Use at least 16 characters' : 'Missing — click Generate' },
    { label: 'Webhook URL', ok: /^https:\/\/[^<>\s]+$/.test(webhookUrl), msg: 'Still a placeholder — it is set when the backend is deployed (HTTPS)' },
  ]
}

export default function ConnectionPanel({ config, canManage }) {
  const toast = useToast()
  const [result, setResult] = useState(null)
  const { register, handleSubmit, reset, setValue, getValues, watch, formState: { errors, isDirty, isSubmitting } } = useForm({ defaultValues: pick(config) })
  useEffect(() => { reset(pick(config)) }, [config, reset])

  const onSave = (v) => {
    const changed = ['phoneNumberId', 'wabaId', 'accessToken'].some((k) => v[k] !== config[k])
    updateSection('whatsapp.config', { ...v, ...(changed ? { status: 'Not connected', lastChecked: '' } : {}) })
    logActivity('whatsapp', 'WhatsApp API configuration updated')
    toast.success('WhatsApp configuration saved')
    if (changed) setResult(null)
  }
  const onToggle = (enabled) => {
    updateSection('whatsapp.config', { enabled })
    logActivity('whatsapp', `WhatsApp automation ${enabled ? 'enabled' : 'disabled'}`)
    if (enabled && config.status !== 'Connected') toast.warning('Automation is enabled, but no messages will be sent until the WhatsApp Cloud API is connected through the backend.', { duration: 6000 })
    else toast.success(`WhatsApp automation ${enabled ? 'enabled' : 'disabled'}`)
  }
  const onTest = () => {
    const list = checks(getValues(), config.webhookUrl)
    const failed = list.filter((c) => !c.ok).length
    setResult({ list, failed, at: new Date().toISOString() })
    updateSection('whatsapp.config', { lastChecked: new Date().toISOString(), status: 'Not connected' })
    if (failed) toast.error(`${failed} field${failed > 1 ? 's need' : ' needs'} attention before the backend can verify the connection.`)
    else toast.info('Field formats look valid. Live verification needs the backend endpoint.')
  }
  const onGenerate = () => { setValue('verifyToken', `rsh_${randomToken(20)}`, { shouldDirty: true }); toast.success('New verify token generated — save to keep it') }
  const connected = config.status === 'Connected'
  const verifyToken = watch('verifyToken')

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-6">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Automation</p>
              <p className="mt-0.5 text-xs text-muted">Master switch for all automated WhatsApp messages.</p>
            </div>
            <Toggle checked={config.enabled} onChange={onToggle} disabled={!canManage} label="WhatsApp automation" className="[&>label]:sr-only" />
          </div>
          <p className={cn('mt-3 rounded-lg px-3 py-2 text-xs font-medium', config.enabled ? 'bg-accent-soft text-primary' : 'bg-surface text-muted')}>{config.enabled ? 'Enabled — automations below will run once connected.' : 'Disabled — no automated messages will be queued.'}</p>
        </Card>

        <Card title="Connection Status" actions={<StatusBadge status={config.status || 'Not connected'} />}>
          <div className="flex items-center gap-3">
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', connected ? 'bg-accent-soft text-primary' : 'bg-surface text-muted')}>{connected ? <PlugZap className="h-6 w-6" /> : <Unplug className="h-6 w-6" />}</span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">WhatsApp Business Cloud API</p>
              <p className="text-xs text-muted">{connected ? 'Verified by the backend.' : 'Not connected — credentials have not been verified by a backend.'}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-muted">Business phone</dt><dd className="font-medium">{config.businessPhone || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">API version</dt><dd className="font-medium">{config.apiVersion}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Last checked</dt><dd className="font-medium">{config.lastChecked ? dateTime(config.lastChecked) : 'Never'}</dd></div>
          </dl>
          <Button variant="outline" icon={RefreshCw} className="mt-4 w-full" onClick={onTest} disabled={!canManage}>Test connection</Button>
          {result && (
            <div className="mt-4 space-y-3">
              <ul className="space-y-1.5" aria-label="Configuration checks">
                {result.list.map((c) => (
                  <li key={c.label} className="flex items-start gap-2 text-xs">
                    {!c.ok ? <XCircle className="mt-px h-4 w-4 shrink-0 text-red-600" aria-label="Problem" /> : c.warn ? <CircleAlert className="mt-px h-4 w-4 shrink-0 text-amber-600" aria-label="Warning" /> : <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-accent" aria-label="Format OK" />}
                    <span><b className="font-medium text-ink">{c.label}</b>{!c.ok ? <span className="text-red-700"> — {c.msg}</span> : c.warn ? <span className="text-amber-700"> — {c.warnMsg}</span> : <span className="text-muted"> — format OK</span>}</span>
                  </li>
                ))}
              </ul>
              <DemoNote>
                <b>Not verified.</b> This browser-only version cannot call Meta. To verify, the backend should expose <code className="font-mono">POST /api/whatsapp/verify</code>, which calls <code className="font-mono break-all">GET https://graph.facebook.com/{config.apiVersion}/&lt;phone-number-id&gt;</code> with the stored access token and saves the status as “Connected” only when Meta responds successfully.
              </DemoNote>
            </div>
          )}
        </Card>
      </div>

      <FormCard title="API Configuration" subtitle="WhatsApp Business Cloud API credentials and webhook" id="wa-config" onSubmit={handleSubmit(onSave)} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canManage} onReset={() => reset(pick(config))}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone Number ID" error={errors.phoneNumberId} htmlFor="wa-pnid" hint="Meta → WhatsApp → API Setup">
            <Input id="wa-pnid" inputMode="numeric" placeholder="e.g. 109876543210987" error={errors.phoneNumberId} {...register('phoneNumberId', { pattern: { value: /^\d{10,20}$/, message: 'Phone Number ID is 10–20 digits' } })} />
          </Field>
          <Field label="WhatsApp Business Account ID" error={errors.wabaId} htmlFor="wa-waba">
            <Input id="wa-waba" inputMode="numeric" placeholder="e.g. 102345678901234" error={errors.wabaId} {...register('wabaId', { pattern: { value: /^\d{10,20}$/, message: 'Account ID is 10–20 digits' } })} />
          </Field>
          <Field label="Business Phone Number" error={errors.businessPhone} htmlFor="wa-phone">
            <Input id="wa-phone" inputMode="tel" placeholder="+91 98765 43210" error={errors.businessPhone} {...register('businessPhone', { pattern: { value: /^\+?\d[\d\s-]{9,16}$/, message: 'Use international format, e.g. +91 98765 43210' } })} />
          </Field>
          <Field label="API Version" htmlFor="wa-ver"><Select id="wa-ver" options={API_VERSIONS} {...register('apiVersion')} /></Field>
          <Field label="Access Token" htmlFor="wa-token" className="sm:col-span-2" error={errors.accessToken} hint="Permanent System User token with whatsapp_business_messaging permission">
            <SecretInput id="wa-token" placeholder="EAAG…" error={errors.accessToken} {...register('accessToken', { minLength: { value: 50, message: 'This looks too short for a Meta access token' } })} />
          </Field>
          <div className="sm:col-span-2">
            <label htmlFor="wa-hook" className="label">Webhook Callback URL</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="wa-hook" readOnly value={config.webhookUrl} className="bg-surface font-mono text-[13px]" />
              <CopyButton value={config.webhookUrl} ariaLabel="Copy webhook URL" />
            </div>
            <p className="mt-1 text-xs text-muted">Paste this into Meta → WhatsApp → Configuration. It is served by the backend, so it is read-only here.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="wa-verify" className="label">Webhook Verify Token</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="wa-verify" className="font-mono text-[13px]" error={errors.verifyToken} {...register('verifyToken', { minLength: { value: 16, message: 'Use at least 16 characters' } })} />
              <Button variant="outline" icon={KeyRound} onClick={onGenerate}>Generate</Button>
              {verifyToken && <CopyButton value={verifyToken} ariaLabel="Copy verify token" />}
            </div>
            {errors.verifyToken ? <p role="alert" className="mt-1 text-xs text-red-600">{errors.verifyToken.message}</p> : <p className="mt-1 text-xs text-muted">Enter the same value in Meta when subscribing the webhook.</p>}
          </div>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
          <ShieldAlert className="mt-px h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          In production the access token and verify token must be stored on the server (environment variables / secrets manager), never in the browser. This demo keeps them in local storage only so the form can be filled in.
        </p>
      </FormCard>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, ShieldAlert, Sparkles, XCircle } from 'lucide-react'
import { Badge, Button, Card, DemoNote, Field, Input, Select, StatusBadge, Textarea, useToast } from '../../components/ui'
import { logActivity, updateSection } from '../../services/store'
import { FormCard, SecretInput, ToggleField } from '../settings/common'
import { PROVIDERS } from './constants'

const LANGUAGES = ['English', 'Tamil', 'English + Tamil', 'Hindi', 'English + Hindi']
const TONES = ['Friendly', 'Professional', 'Concise', 'Warm & traditional']
const FIELDS = ['enabled', 'botName', 'welcome', 'businessInfo', 'language', 'tone', 'handover', 'handoverKeywords', 'handoverMessage', 'workingHours', 'provider', 'model', 'apiKey', 'temperature']
const pick = (s) => Object.fromEntries(FIELDS.map((k) => [k, s[k] ?? (k === 'temperature' ? 0.3 : '')]))

export default function BotSettings({ settings, canManage }) {
  const toast = useToast()
  const [check, setCheck] = useState(null)
  const { register, handleSubmit, reset, watch, control, getValues, formState: { errors, isDirty, isSubmitting } } = useForm({ defaultValues: pick(settings) })
  useEffect(() => { reset(pick(settings)) }, [settings, reset])
  const provider = watch('provider')
  const temperature = watch('temperature')
  const handover = watch('handover')
  const meta = PROVIDERS[provider] || PROVIDERS['Not configured']

  const onSave = (v) => {
    updateSection('chatbot.settings', { ...v, temperature: Number(v.temperature), botName: v.botName.trim(), model: v.provider === 'Not configured' ? '' : (v.model || '').trim(), apiKey: v.provider === 'Not configured' ? '' : (v.apiKey || '').trim() })
    logActivity('chatbot', 'Chatbot settings updated')
    toast.success('Chatbot settings saved')
  }
  const onCheck = () => {
    const v = { ...getValues() }; v.model = v.model || ''; v.apiKey = v.apiKey || ''
    const p = PROVIDERS[v.provider]
    const items = v.provider === 'Not configured' ? [{ ok: false, label: 'Choose an AI provider first' }] : [
      { ok: !!v.model.trim(), label: v.model.trim() ? `Model “${v.model.trim()}” set` : 'Model is missing' },
      { ok: v.apiKey.startsWith(p.keyPrefix) && v.apiKey.length >= 30, label: !v.apiKey ? 'API key is missing' : v.apiKey.startsWith(p.keyPrefix) && v.apiKey.length >= 30 ? 'API key format looks valid' : `API key format does not match ${v.provider} (${p.keyHint.toLowerCase()})` },
    ]
    setCheck(items)
  }

  return (
    <div className="grid gap-6 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <FormCard title="Chatbot Settings" subtitle="How the assistant introduces itself and behaves" id="bot-settings" onSubmit={handleSubmit(onSave)} isDirty={isDirty} isSubmitting={isSubmitting} canEdit={canManage} onReset={() => reset(pick(settings))}>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <ToggleField control={control} name="enabled" label="Enable chatbot" description="Show the assistant on the website and WhatsApp" className="sm:col-span-2" />
            <Field label="Bot Name" required error={errors.botName} htmlFor="bs-name"><Input id="bs-name" error={errors.botName} {...register('botName', { required: 'Bot name is required', maxLength: { value: 40, message: 'Max 40 characters' } })} /></Field>
            <Field label="Working Hours" htmlFor="bs-hours" hint="Shown when a human agent is requested"><Input id="bs-hours" {...register('workingHours')} /></Field>
            <Field label="Language" htmlFor="bs-lang"><Select id="bs-lang" options={LANGUAGES} {...register('language')} /></Field>
            <Field label="Tone" htmlFor="bs-tone"><Select id="bs-tone" options={TONES} {...register('tone')} /></Field>
            <Field label="Welcome Message" required error={errors.welcome} htmlFor="bs-welcome" className="sm:col-span-2"><Textarea id="bs-welcome" rows={2} error={errors.welcome} {...register('welcome', { required: 'Welcome message is required', maxLength: { value: 500, message: 'Max 500 characters' } })} /></Field>
            <Field label="Business Information" htmlFor="bs-info" hint="Used as context for answers — address, products, policies" className="sm:col-span-2"><Textarea id="bs-info" rows={4} {...register('businessInfo')} /></Field>
          </section>

          <section className="space-y-4 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">Human Handover</h3>
            <ToggleField control={control} name="handover" label="Allow handover to a human agent" description="When a keyword matches, the conversation is marked “Handed over”" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Handover Keywords" htmlFor="bs-hkw" hint="Comma separated" error={errors.handoverKeywords}>
                <Input id="bs-hkw" disabled={!handover} error={errors.handoverKeywords} {...register('handoverKeywords', { validate: (x, all) => !all.handover || !!x.trim() || 'Add at least one keyword' })} />
              </Field>
              <Field label="Handover Message" htmlFor="bs-hmsg"><Input id="bs-hmsg" disabled={!handover} {...register('handoverMessage')} /></Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">AI Provider</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provider" htmlFor="bs-prov"><Select id="bs-prov" options={Object.keys(PROVIDERS)} {...register('provider')} /></Field>
              <Field label="Model" htmlFor="bs-model" error={errors.model}>
                <Input id="bs-model" list="bs-model-list" disabled={provider === 'Not configured'} placeholder={meta.models[0] || 'Select a provider first'} error={errors.model}
                  {...register('model', { validate: (x, all) => all.provider === 'Not configured' || !!x.trim() || 'Model is required' })} />
                <datalist id="bs-model-list">{meta.models.map((m) => <option key={m} value={m} />)}</datalist>
              </Field>
              <Field label="API Key" htmlFor="bs-key" className="sm:col-span-2" hint={meta.keyHint} error={errors.apiKey}>
                <SecretInput id="bs-key" disabled={provider === 'Not configured'} placeholder={provider === 'Not configured' ? 'Select a provider first' : `${meta.keyPrefix}…`} error={errors.apiKey}
                  {...register('apiKey', { validate: (x, all) => all.provider === 'Not configured' || !x || x.startsWith(PROVIDERS[all.provider].keyPrefix) || `${all.provider} keys ${PROVIDERS[all.provider].keyHint.toLowerCase()}` })} />
              </Field>
              <div className="sm:col-span-2">
                <label htmlFor="bs-temp" className="label">Temperature <span className="font-mono text-muted">{Number(temperature).toFixed(1)}</span></label>
                <input id="bs-temp" type="range" min="0" max="1" step="0.1" className="w-full accent-[#16a34a]" {...register('temperature', { valueAsNumber: true })} />
                <div className="flex justify-between text-[11px] text-muted"><span>Precise (0)</span><span>Creative (1)</span></div>
              </div>
            </div>
            <p className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
              <ShieldAlert className="mt-px h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              In production the API key must be stored on the server and requests proxied through the backend — never call the AI provider from the browser with the key.
            </p>
          </section>
        </div>
      </FormCard>

      <div className="space-y-6">
        <Card title="AI Provider Status" actions={<StatusBadge status="Not connected" />}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-5 w-5" /></span>
            <div className="min-w-0 text-sm"><p className="font-semibold">{settings.provider === 'Not configured' ? 'No provider selected' : `${settings.provider}${settings.model ? ` · ${settings.model}` : ''}`}</p><p className="text-xs text-muted">Replies currently come from flows and the knowledge base.</p></div>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={onCheck} disabled={!canManage}>Test connection</Button>
          {check && (
            <div className="mt-4 space-y-3">
              <ul className="space-y-1.5">
                {check.map((c) => <li key={c.label} className="flex items-start gap-2 text-xs">{c.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-label="OK" /> : <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-label="Problem" />}{c.label}</li>)}
              </ul>
              <DemoNote><b>Not verified.</b> The browser cannot safely call the provider. Add a backend endpoint such as <code className="font-mono">POST /api/chatbot/verify</code> that reads the key from server environment variables, sends a one-token test request to the provider and stores the result.</DemoNote>
            </div>
          )}
        </Card>
        <Card title="How replies work">
          <ol className="list-decimal space-y-2 pl-4 text-[13px] text-muted">
            <li>Handover keywords → <Badge tone="purple">Handed over</Badge></li>
            <li>Order numbers like RSH-10234 are looked up in orders.</li>
            <li>Enabled flows are matched by keywords.</li>
            <li>Knowledge base questions are matched by wording.</li>
            <li>Once a provider is connected through the backend, anything unmatched can be answered by the AI model using your business information.</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}

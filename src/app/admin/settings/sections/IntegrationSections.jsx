import { useNavigate } from '@admin/_lib/navigation'
import { AlertTriangle, ArrowRight, Bot, Database, MessageCircle, RotateCcw, UploadCloud } from 'lucide-react'
import { Button, Card, DemoNote, InfoList, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { resetDemoData, syncSeedToFirestore, useDb } from '@admin/_lib/store'
import { firebaseConfig } from '@admin/_lib/firebase'
import { useState } from 'react'
import { dateTime } from '@admin/_lib/format'

function IntegrationCard({ icon: Icon, tone, title, text, status, items, to, cta, note }) {
  return (
    <Card title={title} actions={<StatusBadge status={status} />}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <p className="text-sm text-muted">{text}</p>
      </div>
      <InfoList className="mt-4" items={items} />
      {note && <DemoNote className="mt-4">{note}</DemoNote>}
      <Button as="link" to={to} variant="outline" iconRight={ArrowRight} className="mt-4">{cta}</Button>
    </Card>
  )
}

export function WhatsAppApiSettings() {
  const db = useDb()
  const c = db.whatsapp.config
  return (
    <IntegrationCard icon={MessageCircle} tone="bg-green-50 text-green-700" title="WhatsApp API" status={c.status || 'Not connected'}
      text="Credentials, webhook, templates and automations are managed on the WhatsApp Automation page."
      items={[['Automation', c.enabled ? 'Enabled' : 'Disabled'], ['Phone Number ID', c.phoneNumberId || 'Not set'], ['Business account ID', c.wabaId || 'Not set'], ['API version', c.apiVersion], ['Last checked', c.lastChecked ? dateTime(c.lastChecked) : 'Never'], ['Active automations', `${db.whatsapp.automations.filter((a) => a.enabled).length} of ${db.whatsapp.automations.length}`]]}
      note={c.status !== 'Connected' ? 'Not connected: messages cannot be sent until the backend verifies the Cloud API credentials.' : null}
      to="/whatsapp" cta="Open WhatsApp Automation" />
  )
}

export function AiSettings() {
  const db = useDb()
  const s = db.chatbot.settings
  const configured = s.provider && s.provider !== 'Not configured'
  return (
    <IntegrationCard icon={Bot} tone="bg-violet-50 text-violet-600" title="AI Configuration" status="Not connected"
      text="Provider, model, API key, tone and handover rules are managed in AI Chatbot → Settings."
      items={[['Chatbot', s.enabled ? 'Enabled' : 'Disabled'], ['Provider', s.provider || 'Not configured'], ['Model', s.model || '—'], ['API key', configured && s.apiKey ? 'Entered (stored in browser for demo)' : 'Not set'], ['Temperature', String(s.temperature)], ['Human handover', s.handover ? 'On' : 'Off']]}
      note="No AI provider is called from this frontend. Replies use flows and the knowledge base until the backend proxies requests to the provider."
      to="/ai-chatbot?tab=settings" cta="Open AI Chatbot settings" />
  )
}

export function FirebaseSettings() {
  const toast = useToast()
  const db = useDb()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const ok = await syncSeedToFirestore(db)
      if (ok) {
        toast.success('Successfully synchronized all products, categories, brands, orders & customers to Firestore!')
      } else {
        toast.error('Could not complete Firestore sync. Check browser console.')
      }
    } catch (err) {
      toast.error(err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card title="Firebase & Firestore Cloud Database" actions={<StatusBadge status="Connected" />}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Connected to Firebase Project &ldquo;{firebaseConfig.projectId}&rdquo;</p>
          <p className="text-xs text-muted">Cloud Firestore and Firebase Storage are actively syncing products, orders, categories, and brands.</p>
        </div>
      </div>

      <InfoList
        className="mt-4"
        items={[
          ['Project ID', firebaseConfig.projectId],
          ['Auth Domain', firebaseConfig.authDomain],
          ['Storage Bucket', firebaseConfig.storageBucket],
          ['Authentication', 'Email / Password'],
          ['Database', 'Cloud Firestore (Real-time snapshots)'],
          ['Storage Limit', 'Max 4 images per product (2 MB max per image)'],
        ]}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="mr-auto">
          <p className="text-xs font-semibold text-ink">Sync Database to Firestore</p>
          <p className="text-xs text-muted">Push all local products, categories, brands, orders, and settings to Cloud Firestore.</p>
        </div>
        <Button icon={UploadCloud} loading={syncing} onClick={handleSync}>
          Sync to Firestore Now
        </Button>
      </div>
    </Card>
  )
}

export function DangerZone() {
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const onReset = async () => {
    if (!(await confirm({ title: 'Reset all demo data?', message: 'This replaces every product, order, customer, branch, setting and user with the original sample data. All changes made in this browser will be lost.', confirmText: 'Reset data' }))) return
    resetDemoData()
    toast.success('Demo data has been reset')
    navigate('/settings?tab=general', { replace: true })
  }
  return (
    <Card title={<span className="text-red-700">Danger Zone</span>} className="border-red-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold">Reset demo data</p>
            <p className="mt-0.5 text-sm text-muted">Restore the original sample data stored in this browser. Users and passwords also return to the defaults.</p>
          </div>
        </div>
        <Button variant="danger" icon={RotateCcw} onClick={onReset}>Reset demo data</Button>
      </div>
    </Card>
  )
}

import { useMemo, useState } from 'react'
import { Mail, Megaphone, MessageCircle, MessageSquare, Pencil, Plus, Send, Trash2, Undo2 } from 'lucide-react'
import { Badge, Button, Card, DataTable, DemoNote, EmptyState, FilterSelect, IconButton, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { logActivity, removeItem, updateItem, useDb } from '@admin/_lib/store'
import { dateTime, num } from '@admin/_lib/format'
import { useNow } from '@admin/_lib/useNow'
import CampaignFormModal from './CampaignFormModal'
import { CHANNELS, reachable, reachNote, segmentLabel, segmentMembers, segmentOf } from './marketingUtils'

const CH_ICON = { WhatsApp: MessageCircle, Email: Mail, SMS: MessageSquare }
const EDITABLE = ['Draft', 'Scheduled']

export default function CampaignsTab({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const [channel, setChannel] = useState('all')
  const [editing, setEditing] = useState(undefined)
  const now = useNow()
  const tpl = useMemo(() => Object.fromEntries(db.whatsapp.templates.map((t) => [t.id, t])), [db.whatsapp.templates])

  const rows = useMemo(() => db.campaigns.map((c) => {
    const seg = segmentOf(c)
    const members = segmentMembers(db, seg)
    return { ...c, seg, live: EDITABLE.includes(c.status) ? reachable(members, c.channel).length : c.recipients || 0, members: members.length }
  }), [db])
  const filtered = rows.filter((c) => channel === 'all' || c.channel === channel)

  const sendNow = async (c) => {
    if (!c.live) return toast.error('This segment has no reachable recipients on this channel.')
    if (c.channel === 'WhatsApp' && tpl[c.templateId]?.status !== 'Approved') return toast.error('Choose an approved WhatsApp template before sending (edit the campaign).')
    const ok = await confirm({
      title: 'Queue campaign now?', tone: 'primary', confirmText: 'Queue Campaign',
      message: `“${c.name}” will be queued for ${num(c.live)} recipients via ${c.channel}. No messages are delivered from this panel yet — the backend (${c.channel === 'WhatsApp' ? 'WhatsApp Cloud API' : c.channel === 'Email' ? 'email provider' : 'SMS gateway'}) must be connected to actually send them.`,
    })
    if (!ok) return
    updateItem('campaigns', c.id, { status: 'Queued', queuedAt: new Date().toISOString(), recipients: c.live })
    logActivity('marketing', `Campaign queued (not sent — backend not connected): ${c.name}, ${c.live} recipients`)
    toast.info('Campaign queued. No messages were sent because the messaging backend is not connected.', { title: 'Queued — not sent' })
  }
  const backToDraft = (c) => {
    updateItem('campaigns', c.id, { status: 'Draft', queuedAt: '' })
    logActivity('marketing', `Campaign moved back to draft: ${c.name}`)
    toast.success('Campaign moved back to draft')
  }
  const onDelete = async (c) => {
    if (!(await confirm({ title: 'Delete campaign?', message: `Delete “${c.name}”? This cannot be undone.`, confirmText: 'Delete' }))) return
    removeItem('campaigns', c.id)
    logActivity('marketing', `Campaign deleted: ${c.name}`)
    toast.success('Campaign deleted')
  }

  const columns = [
    { key: 'name', label: 'Campaign', sortable: true, render: (c) => (
      <div className="min-w-[160px] max-w-[240px]"><p className="font-medium text-ink">{c.name}</p>{c.notes && <p className="truncate text-xs text-muted" title={c.notes}>{c.notes}</p>}</div>
    ) },
    { key: 'channel', label: 'Channel', sortable: true, render: (c) => { const I = CH_ICON[c.channel] || Megaphone; return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><I className="h-4 w-4 text-accent" aria-hidden />{c.channel}</span> } },
    { key: 'audience', label: 'Audience', sortable: true, sortValue: (c) => c.live, render: (c) => (
      <div className="min-w-[150px] max-w-[200px]"><p className="text-ink">{segmentLabel(c.seg)}</p><p className="text-xs text-muted" title={EDITABLE.includes(c.status) ? `Customers ${reachNote[c.channel]}` : undefined}>{num(c.live)} {EDITABLE.includes(c.status) ? 'reachable now' : 'recipients when queued'}</p></div>
    ) },
    { key: 'templateId', label: 'Template', render: (c) => (c.channel === 'WhatsApp' ? (tpl[c.templateId] ? <span className="whitespace-nowrap font-mono text-xs">{tpl[c.templateId].name}{tpl[c.templateId].status !== 'Approved' && <Badge tone="amber" className="ml-1.5 font-sans">{tpl[c.templateId].status}</Badge>}</span> : <span className="text-xs text-red-600">Not selected</span>) : <span className="text-muted">—</span>) },
    { key: 'scheduledAt', label: 'Schedule', sortable: true, render: (c) => {
      const due = c.status === 'Scheduled' && c.scheduledAt && new Date(c.scheduledAt) < now
      return <div className="whitespace-nowrap text-[13px]">{c.scheduledAt ? dateTime(c.scheduledAt) : <span className="text-muted">Not scheduled</span>}{due && <p className="text-xs text-amber-700">Due — waiting for backend</p>}{c.status === 'Queued' && c.queuedAt && <p className="text-xs text-muted">Queued {dateTime(c.queuedAt)}</p>}</div>
    } },
    { key: 'status', label: 'Status', sortable: true, render: (c) => (c.status === 'Queued' ? <Badge tone="amber" dot>Queued · not sent</Badge> : <span className="inline-flex flex-col items-start gap-0.5"><StatusBadge status={c.status} />{c.status === 'Completed' && <span className="text-[11px] text-muted">Sample record</span>}</span>) },
    ...(canManage ? [{ key: 'actions', label: 'Actions', align: 'right', render: (c) => (
      <div className="flex justify-end gap-1">
        {EDITABLE.includes(c.status) && <Button size="sm" variant="secondary" icon={Send} onClick={() => sendNow(c)} aria-label={`Send ${c.name} now`} title="Queue for sending">Send</Button>}
        {c.status === 'Queued' && <IconButton icon={Undo2} label={`Move ${c.name} back to draft`} size="sm" onClick={() => backToDraft(c)} />}
        {EDITABLE.includes(c.status) && <IconButton icon={Pencil} label={`Edit ${c.name}`} size="sm" variant="primary" onClick={() => setEditing(c)} />}
        <IconButton icon={Trash2} label={`Delete ${c.name}`} size="sm" variant="danger" onClick={() => onDelete(c)} />
      </div>
    ) }] : []),
  ]

  return (
    <>
      <DemoNote className="mb-4">
        Campaign delivery needs the backend: <b>Send now</b> marks a campaign <b>Queued (not sent)</b> and nothing reaches customers until the WhatsApp Cloud API, email provider or SMS gateway is connected to process the queue. Recipient counts are calculated live from your customer list (WhatsApp counts only opted-in customers).
      </DemoNote>
      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted">{num(filtered.length)} campaign{filtered.length === 1 ? '' : 's'}</p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <FilterSelect label="Channel" value={channel} onChange={setChannel} allLabel="All Channels" options={CHANNELS} />
            {canManage && <Button icon={Plus} size="sm" className="h-9" onClick={() => setEditing(null)}>New Campaign</Button>}
          </div>
        </div>
        <DataTable columns={columns} rows={filtered} initialSort={{ key: 'scheduledAt', dir: 'desc' }}
          empty={<EmptyState icon={Megaphone} title="No campaigns" text="Create a WhatsApp, email or SMS campaign for a customer segment." />} />
      </Card>
      <CampaignFormModal open={editing !== undefined} campaign={editing} onClose={() => setEditing(undefined)} />
    </>
  )
}

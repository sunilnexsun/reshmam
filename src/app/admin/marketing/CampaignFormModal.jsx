import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Users } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, logActivity, updateItem, useDb } from '@admin/_lib/store'
import { num } from '@admin/_lib/format'
import { CHANNELS, reachable, reachNote, SEGMENTS, segmentLabel, segmentMembers, segmentOf, toLocalInput } from './marketingUtils'

const isFuture = (v) => new Date(v).getTime() > Date.now()
const blank = { name: '', channel: 'WhatsApp', segment: 'optin', templateId: '', scheduledAt: '', status: 'Draft', notes: '' }

/** Add / edit a campaign (Draft or Scheduled). Nothing is sent from here. */
export default function CampaignFormModal({ open, onClose, campaign }) {
  const db = useDb()
  const toast = useToast()
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank })
  useEffect(() => {
    if (!open) return
    reset(campaign ? { ...blank, ...campaign, segment: segmentOf(campaign), scheduledAt: toLocalInput(campaign.scheduledAt), status: campaign.status === 'Scheduled' ? 'Scheduled' : 'Draft', notes: campaign.notes || '' } : blank)
  }, [open, campaign, reset])

  const [channel, segment, templateId, status] = useWatch({ control, name: ['channel', 'segment', 'templateId', 'status'] })
  const templates = db.whatsapp.templates
  const audience = useMemo(() => {
    const members = segmentMembers(db, segment)
    return { members: members.length, reach: reachable(members, channel).length }
  }, [db, segment, channel])
  const tpl = templates.find((t) => t.id === templateId)

  const onSubmit = (v) => {
    const data = {
      name: v.name.trim(), channel: v.channel, segment: v.segment, audience: segmentLabel(v.segment),
      templateId: v.channel === 'WhatsApp' ? v.templateId : '',
      scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : '',
      status: v.status, recipients: audience.reach, notes: v.notes.trim(),
    }
    if (campaign) updateItem('campaigns', campaign.id, data)
    else createItem('campaigns', data, 'cm')
    logActivity('marketing', `Campaign ${campaign ? 'updated' : 'created'}: ${data.name} (${data.status})`)
    toast.success(campaign ? 'Campaign updated' : `Campaign saved as ${data.status.toLowerCase()}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={campaign ? 'Edit Campaign' : 'New Campaign'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="campaign-form" loading={isSubmitting}>{campaign ? 'Save Changes' : 'Save Campaign'}</Button></>}>
      <form id="campaign-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign Name" required error={errors.name} htmlFor="cm-name" className="sm:col-span-2">
          <Input id="cm-name" error={errors.name} placeholder="e.g. Pongal gingelly oil offer" {...register('name', { required: 'Campaign name is required', minLength: { value: 3, message: 'Name is too short' }, maxLength: { value: 80, message: 'Keep it under 80 characters' } })} />
        </Field>
        <Field label="Channel" htmlFor="cm-channel"><Select id="cm-channel" options={CHANNELS} {...register('channel')} /></Field>
        <Field label="Audience Segment" htmlFor="cm-seg"><Select id="cm-seg" options={SEGMENTS} {...register('segment')} /></Field>

        <div className="flex items-start gap-3 rounded-lg border border-line bg-surface/60 px-3 py-2.5 text-sm sm:col-span-2" aria-live="polite">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <p><b className="text-ink">{num(audience.reach)} recipients</b> <span className="text-muted">— {num(audience.members)} active customers in this segment, {num(audience.reach)} {reachNote[channel]}.</span></p>
        </div>

        {channel === 'WhatsApp' && (
          <Field label="WhatsApp Template" required error={errors.templateId} htmlFor="cm-tpl" className="sm:col-span-2"
            hint="Meta only allows approved templates for marketing messages.">
            <Select id="cm-tpl" error={errors.templateId} placeholder="Select a template"
              options={templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.type} · ${t.language} — ${t.status}` }))}
              {...register('templateId', { validate: (x, all) => all.channel !== 'WhatsApp' || (!x ? 'Choose a template' : templates.find((t) => t.id === x)?.status === 'Approved' || 'This template is not approved yet — pick an approved one') })} />
          </Field>
        )}
        {channel === 'WhatsApp' && tpl && (
          <div className="rounded-lg bg-[#E7F6EC] p-3 text-sm sm:col-span-2">
            <p className="mb-1 text-xs font-medium text-muted">Template preview</p>
            <div className="max-w-sm rounded-lg bg-white p-3 shadow-sm">
              {tpl.header && <p className="font-semibold text-ink">{tpl.header}</p>}
              <p className="whitespace-pre-wrap text-ink">{tpl.body}</p>
              {tpl.footer && <p className="mt-1 text-xs text-muted">{tpl.footer}</p>}
            </div>
          </div>
        )}

        <Field label="Status" htmlFor="cm-status"><Select id="cm-status" options={['Draft', 'Scheduled']} {...register('status')} /></Field>
        <Field label="Schedule Date & Time" required={status === 'Scheduled'} error={errors.scheduledAt} htmlFor="cm-at" hint={status === 'Draft' ? 'Optional for drafts' : undefined}>
          <Input id="cm-at" type="datetime-local" error={errors.scheduledAt}
            {...register('scheduledAt', { validate: (x, all) => { if (all.status !== 'Scheduled') return true; if (!x) return 'Pick when the campaign should go out'; return isFuture(x) || 'Schedule must be in the future' } })} />
        </Field>
        <Field label="Notes" htmlFor="cm-notes" className="sm:col-span-2"><Textarea id="cm-notes" rows={2} placeholder="Internal notes (offer details, coupon code to mention…)" {...register('notes')} /></Field>
      </form>
    </Modal>
  )
}

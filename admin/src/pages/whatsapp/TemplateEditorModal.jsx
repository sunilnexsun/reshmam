import { useEffect, useMemo, useRef } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button, DemoNote, Field, IconButton, Input, Modal, Select, StatusBadge, Textarea, useToast } from '../../components/ui'
import { createItem, getState, logActivity, updateItem, useDb } from '../../services/store'
import PhonePreview from './PhonePreview'
import { TEMPLATE_LANGUAGES, TEMPLATE_TYPES, VARIABLES, render, sampleValues, unknownVariables } from './waUtils'

const empty = { name: '', type: 'Utility', language: 'English', header: '', body: '', footer: '', buttons: [] }
const MAX_BUTTONS = 3

/** Create / edit a WhatsApp message template with a live phone preview. */
export default function TemplateEditorModal({ open, onClose, template }) {
  const toast = useToast()
  const db = useDb()
  const samples = useMemo(() => sampleValues(db), [db])
  const bodyRef = useRef(null)
  const { register, handleSubmit, reset, control, watch, setValue, getValues, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: empty })
  const { fields, append, remove } = useFieldArray({ control, name: 'buttons' })
  useEffect(() => {
    if (open) reset(template ? { ...empty, ...template, buttons: (template.buttons || []).map((text) => ({ text })) } : empty)
  }, [open, template, reset])

  const v = watch()
  const bodyReg = register('body', {
    required: 'Message body is required',
    maxLength: { value: 1024, message: 'Body can be at most 1024 characters' },
    validate: (x) => { const u = unknownVariables(x); return !u.length || `Unknown variable: {{${u[0]}}}` },
  })

  const insertVar = (key) => {
    const el = bodyRef.current
    const cur = getValues('body') || ''
    const token = `{{${key}}}`
    const start = el?.selectionStart ?? cur.length
    const end = el?.selectionEnd ?? cur.length
    setValue('body', cur.slice(0, start) + token + cur.slice(end), { shouldDirty: true, shouldValidate: true })
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + token.length, start + token.length) } })
  }

  const onSubmit = (f) => {
    const name = f.name.trim()
    const dup = getState().whatsapp.templates.find((t) => t.id !== template?.id && t.name === name && t.language === f.language)
    if (dup) return toast.error(`A ${f.language} template named “${name}” already exists.`)
    const data = { name, type: f.type, language: f.language, header: f.header.trim(), body: f.body.trim(), footer: f.footer.trim(), buttons: f.buttons.map((b) => b.text.trim()).filter(Boolean), updatedAt: new Date().toISOString() }
    if (template) {
      const contentChanged = ['header', 'body', 'footer', 'type', 'language'].some((k) => data[k] !== (template[k] || '')) || data.buttons.join('|') !== (template.buttons || []).join('|')
      updateItem('whatsapp.templates', template.id, { ...data, status: contentChanged ? 'Draft' : template.status })
      logActivity('whatsapp', `Template updated: ${name}`)
      toast.success(contentChanged && template.status !== 'Draft' ? 'Template saved as Draft — it must be re-approved by Meta before use' : 'Template updated')
    } else {
      createItem('whatsapp.templates', { ...data, status: 'Draft' }, 'wt')
      logActivity('whatsapp', `Template created: ${name}`)
      toast.success('Template created as Draft')
    }
    onClose()
  }

  const bodyLen = (v.body || '').length
  return (
    <Modal open={open} onClose={onClose} size="full" title={template ? `Edit Template · ${template.name}` : 'New Message Template'}
      subtitle={template ? <span className="inline-flex items-center gap-2">Current status <StatusBadge status={template.status} /></span> : 'New templates are saved as Draft. Only Meta can approve a template.'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="wa-template-form" loading={isSubmitting} disabled={template && !isDirty}>{template ? 'Save Template' : 'Create Template'}</Button></>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form id="wa-template-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
          <Field label="Template Name" required error={errors.name} htmlFor="t-name" hint="Lowercase letters, numbers and underscores" className="sm:col-span-2">
            <Input id="t-name" className="font-mono" placeholder="order_confirmation" error={errors.name}
              {...register('name', { required: 'Template name is required', maxLength: { value: 512, message: 'Name is too long' }, pattern: { value: /^[a-z][a-z0-9_]*$/, message: 'Use lowercase_underscore format, e.g. order_shipped' } })} />
          </Field>
          <Field label="Category" htmlFor="t-type"><Select id="t-type" options={TEMPLATE_TYPES} {...register('type')} /></Field>
          <Field label="Language" htmlFor="t-lang"><Select id="t-lang" options={TEMPLATE_LANGUAGES} {...register('language')} /></Field>
          <Field label="Header (optional)" error={errors.header} htmlFor="t-header" hint={`${(v.header || '').length}/60`} className="sm:col-span-2">
            <Input id="t-header" maxLength={60} error={errors.header} {...register('header', { maxLength: { value: 60, message: 'Max 60 characters' } })} />
          </Field>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-end justify-between gap-2">
              <label htmlFor="t-body" className="label mb-0">Body<span className="text-red-500"> *</span></label>
              <span className={bodyLen > 1024 ? 'text-xs text-red-600' : 'text-xs text-muted'}>{bodyLen}/1024</span>
            </div>
            <Textarea id="t-body" rows={6} error={errors.body} placeholder="Hi {{customer_name}}, your order {{order_id}} …" {...bodyReg} ref={(el) => { bodyReg.ref(el); bodyRef.current = el }} />
            {errors.body && <p role="alert" className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
            <p className="mt-2 mb-1.5 text-xs font-medium text-muted">Insert variable at cursor</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((x) => (
                <button key={x.key} type="button" onClick={() => insertVar(x.key)} title={`Sample: ${samples[x.key]}`}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-primary transition hover:border-accent hover:bg-accent-soft">{`{{${x.key}}}`}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Formatting: *bold*, _italic_, ~strikethrough~</p>
          </div>
          <Field label="Footer (optional)" error={errors.footer} htmlFor="t-footer" hint={`${(v.footer || '').length}/60`} className="sm:col-span-2">
            <Input id="t-footer" maxLength={60} error={errors.footer} placeholder="Reply STOP to opt out" {...register('footer', { maxLength: { value: 60, message: 'Max 60 characters' } })} />
          </Field>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label mb-0">Buttons <span className="font-normal text-muted">({fields.length}/{MAX_BUTTONS})</span></span>
              <Button size="sm" variant="outline" icon={Plus} disabled={fields.length >= MAX_BUTTONS} onClick={() => append({ text: '' })}>Add button</Button>
            </div>
            {fields.length === 0 && <p className="text-xs text-muted">No buttons. Quick-reply or link buttons appear under the message.</p>}
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id}>
                  <div className="flex gap-2">
                    <Input aria-label={`Button ${i + 1} text`} maxLength={25} placeholder={`Button ${i + 1} text`} error={errors.buttons?.[i]?.text}
                      {...register(`buttons.${i}.text`, { required: 'Button text is required', maxLength: { value: 25, message: 'Max 25 characters' } })} />
                    <IconButton icon={Trash2} label={`Remove button ${i + 1}`} variant="danger" onClick={() => remove(i)} />
                  </div>
                  {errors.buttons?.[i]?.text && <p role="alert" className="mt-1 text-xs text-red-600">{errors.buttons[i].text.message}</p>}
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">Live preview · sample values</p>
          <PhonePreview header={render(v.header, samples)} body={render(v.body, samples)} footer={v.footer} buttons={(v.buttons || []).map((b) => b.text)} />
          <DemoNote className="mt-3">Preview uses sample data from your records. Submitting templates to Meta for approval happens from the backend (WhatsApp Business Management API).</DemoNote>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Button, Checkbox, Field, Input, Modal, Textarea, useConfirm, useToast } from '@admin/_components/ui'
import { createItem, getState, logActivity, setState, updateItem } from '@admin/_lib/store'
import { ToggleField } from '@admin/settings/common'
import { splitList } from './botEngine'

const empty = { name: '', question: '', response: '', buttons: '', keywords: '', next: [], enabled: true }

/** Edit or create a flow step. `flow` null → new (placed at `position`). */
export default function FlowEditModal({ open, onClose, flow, flows, position, canManage }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: empty })
  useEffect(() => {
    if (open) reset(flow ? { ...empty, ...flow, buttons: (flow.buttons || []).join(', '), keywords: (flow.keywords || []).join(', '), next: flow.next || [] } : empty)
  }, [open, flow, reset])
  const others = flows.filter((f) => f.id !== flow?.id)

  const onSubmit = (v) => {
    const name = v.name.trim()
    if (getState().chatbot.flows.some((f) => f.id !== flow?.id && f.name.toLowerCase() === name.toLowerCase())) return toast.error(`A flow named “${name}” already exists.`)
    const data = { name, question: v.question.trim(), response: v.response.trim(), buttons: splitList(v.buttons).slice(0, 10), keywords: [...new Set(splitList(v.keywords).map((k) => k.toLowerCase()))], next: Array.isArray(v.next) ? v.next : v.next === true ? [others[0].id] : typeof v.next === 'string' && v.next ? [v.next] : [], enabled: !!v.enabled }
    if (flow) { updateItem('chatbot.flows', flow.id, data); toast.success('Flow updated') }
    else { createItem('chatbot.flows', { ...data, x: position?.x ?? 40, y: position?.y ?? 40 }, 'f'); toast.success('Flow step added') }
    logActivity('chatbot', `Chatbot flow ${flow ? 'updated' : 'added'}: ${name}`)
    onClose()
  }
  const onDelete = async () => {
    const refs = flows.filter((f) => f.next?.includes(flow.id))
    if (!(await confirm({ title: 'Delete flow step?', message: `Delete “${flow.name}”?${refs.length ? ` It will also be unlinked from ${refs.map((r) => r.name).join(', ')}.` : ''}`, confirmText: 'Delete' }))) return
    setState((s) => ({ ...s, chatbot: { ...s.chatbot, flows: s.chatbot.flows.filter((f) => f.id !== flow.id).map((f) => (f.next?.includes(flow.id) ? { ...f, next: f.next.filter((n) => n !== flow.id) } : f)) } }))
    logActivity('chatbot', `Chatbot flow deleted: ${flow.name}`)
    toast.success('Flow step deleted')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={flow ? (canManage ? `Edit flow · ${flow.name}` : flow.name) : 'Add flow step'}
      footer={canManage ? <>
        {flow && <Button variant="danger-outline" icon={Trash2} onClick={onDelete} className="sm:mr-auto">Delete</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="flow-form" loading={isSubmitting}>{flow ? 'Save Flow' : 'Add Step'}</Button>
      </> : <Button onClick={onClose}>Close</Button>}>
      <form id="flow-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset disabled={!canManage} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Step name" required error={errors.name} htmlFor="fl-name"><Input id="fl-name" error={errors.name} {...register('name', { required: 'Name is required', maxLength: { value: 40, message: 'Max 40 characters' } })} /></Field>
          <div className="flex items-end pb-2"><ToggleField control={control} name="enabled" label="Enabled" disabled={!canManage} /></div>
          <Field label="Example customer question" htmlFor="fl-q" className="sm:col-span-2" hint="What a customer typically asks to reach this step"><Input id="fl-q" {...register('question')} /></Field>
          <Field label="Bot response" required error={errors.response} htmlFor="fl-r" className="sm:col-span-2" hint="{{product_name}} is filled from the catalogue when a product is mentioned">
            <Textarea id="fl-r" rows={4} error={errors.response} {...register('response', { required: 'Response is required', maxLength: { value: 1000, message: 'Max 1000 characters' } })} />
          </Field>
          <Field label="Quick-reply buttons" htmlFor="fl-b" hint="Comma separated, e.g. Track Order, Talk to Support"><Input id="fl-b" {...register('buttons')} /></Field>
          <Field label="Keywords" htmlFor="fl-k" error={errors.keywords} hint="Comma separated words that trigger this step">
            <Input id="fl-k" error={errors.keywords} {...register('keywords', { validate: (x) => splitList(x).length > 0 || 'Add at least one keyword' })} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="label">Next step(s)</legend>
            {others.length ? (
              <div className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2">
                {others.map((f) => <Checkbox key={f.id} value={f.id} label={<span>{f.name}{!f.enabled && <span className="text-muted"> (disabled)</span>}</span>} {...register('next')} />)}
              </div>
            ) : <p className="text-xs text-muted">Add more steps to connect them.</p>}
            <p className="mt-1 text-xs text-muted">Connected steps are drawn as arrows in the visual editor and used when a customer taps a quick reply.</p>
          </fieldset>
        </fieldset>
      </form>
    </Modal>
  )
}

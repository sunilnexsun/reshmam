// Small form helpers shared by Settings, WhatsApp Automation and AI Chatbot pages.
import { forwardRef, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { Button, Card, Toggle, useToast } from '../../components/ui'
import { cn } from '../../utils/format'
import { copyText } from './secrets'

/** Password-style input with a show/hide button. Works with react-hook-form register(). */
export const SecretInput = forwardRef(function SecretInput({ className, error, id, ...rest }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input ref={ref} id={id} type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false}
        className={cn('input pr-10 font-mono text-[13px]', error && 'input-error', className)} aria-invalid={error ? true : undefined} {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide value' : 'Show value'} aria-pressed={show}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-surface hover:text-ink">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})

export function CopyButton({ value, label = 'Copy', size = 'md', ariaLabel }) {
  const toast = useToast()
  const [done, setDone] = useState(false)
  const onCopy = async () => {
    if (await copyText(value)) { setDone(true); toast.success('Copied to clipboard'); setTimeout(() => setDone(false), 1500) }
    else toast.error('Could not copy — select the text and copy it manually.')
  }
  return <Button variant="outline" size={size} icon={done ? Check : Copy} onClick={onCopy} aria-label={ariaLabel || label}>{label}</Button>
}

/** Toggle bound to react-hook-form via Controller. */
export function ToggleField({ control, name, label, description, disabled, className }) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <Toggle checked={!!field.value} onChange={(v) => field.onChange(v)} label={label} description={description} disabled={disabled} className={className} />
    )} />
  )
}

/** Card wrapping a settings form: Save enabled only when dirty. */
export function FormCard({ title, subtitle, id, onSubmit, isDirty, isSubmitting, canEdit = true, onReset, children, actions, footerNote }) {
  return (
    <Card title={title} subtitle={subtitle} actions={actions} bodyClassName="p-0">
      <form id={id} onSubmit={onSubmit} noValidate>
        <fieldset disabled={!canEdit} className="min-w-0 p-5">{children}</fieldset>
        {canEdit && (
          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">{footerNote || (isDirty ? 'You have unsaved changes.' : 'All changes saved.')}</p>
            <div className="flex justify-end gap-2">
              {onReset && <Button variant="outline" disabled={!isDirty || isSubmitting} onClick={onReset}>Discard</Button>}
              <Button type="submit" disabled={!isDirty} loading={isSubmitting}>Save Changes</Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  )
}

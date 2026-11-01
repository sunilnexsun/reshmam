import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useToast } from '@admin/_components/ui'
import { logActivity, updateSection } from '@admin/_lib/store'

/** react-hook-form bound to a settings object (e.g. 'settings.tax'). Resets when the stored value changes. */
export function useSectionForm(path, value, { label, transform } = {}) {
  const toast = useToast()
  const form = useForm({ defaultValues: value })
  const { reset, handleSubmit } = form
  useEffect(() => { reset(value) }, [value, reset])
  const onSubmit = handleSubmit((v) => {
    updateSection(path, transform ? transform(v) : v)
    logActivity('settings', `${label} updated`)
    toast.success(`${label} saved`)
  })
  return { ...form, onSubmit, discard: () => reset(value) }
}

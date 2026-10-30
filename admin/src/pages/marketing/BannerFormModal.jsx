import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Field, ImageUploader, Input, Modal, Select, useToast } from '../../components/ui'
import { createItem, getState, logActivity, updateItem } from '../../services/store'
import { BANNER_POSITIONS } from './marketingUtils'

const blank = { title: '', subtitle: '', link: '/products', position: BANNER_POSITIONS[0], order: 1, status: 'Active' }

/** Add / edit a storefront banner. banner null → create. */
export default function BannerFormModal({ open, onClose, banner }) {
  const toast = useToast()
  // Mounted fresh for each open (see BannersTab), so state initialises from props without an effect.
  const [image, setImage] = useState(banner?.image || '')
  const [imageError, setImageError] = useState('')
  const [defaults] = useState(() => banner ? { ...blank, ...banner } : { ...blank, order: Math.max(0, ...getState().banners.map((b) => Number(b.order) || 0)) + 1 })
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults })
  const [title, subtitle] = useWatch({ control, name: ['title', 'subtitle'] })

  const onSubmit = (v) => {
    if (!image) { setImageError('Upload a banner image'); return }
    const data = { title: v.title.trim(), subtitle: v.subtitle.trim(), link: v.link.trim(), position: v.position, order: Number(v.order), status: v.status, image }
    if (banner) updateItem('banners', banner.id, data)
    else createItem('banners', data, 'bn')
    logActivity('marketing', `Banner ${banner ? 'updated' : 'added'}: ${data.title}`)
    toast.success(banner ? 'Banner updated' : 'Banner added')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={banner ? 'Edit Banner' : 'Add Banner'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="banner-form" loading={isSubmitting}>{banner ? 'Save Changes' : 'Add Banner'}</Button></>}>
      <form id="banner-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="label">Banner Image <span className="text-red-500">*</span></p>
          <ImageUploader images={image ? [image] : []} max={1} onChange={(imgs) => { setImage(imgs[0] || ''); if (imgs[0]) setImageError('') }} onError={(m) => toast.error(m)} />
          {imageError && <p role="alert" className="mt-1 text-xs text-red-600">{imageError}</p>}
        </div>
        {image && (
          <div className="relative overflow-hidden rounded-xl bg-primary sm:col-span-2" aria-label="Banner preview">
            <img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-contain opacity-90" />
            <div className="relative max-w-[60%] p-5 text-white">
              <p className="text-[11px] uppercase tracking-wider text-white/70">Preview</p>
              <p className="mt-1 text-lg font-bold leading-tight">{title || 'Banner title'}</p>
              {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
            </div>
          </div>
        )}
        <Field label="Title" required error={errors.title} htmlFor="bn-title" className="sm:col-span-2">
          <Input id="bn-title" error={errors.title} {...register('title', { required: 'Title is required', maxLength: { value: 70, message: 'Keep it under 70 characters' } })} />
        </Field>
        <Field label="Subtitle" htmlFor="bn-sub" className="sm:col-span-2" error={errors.subtitle}>
          <Input id="bn-sub" error={errors.subtitle} {...register('subtitle', { maxLength: { value: 120, message: 'Keep it under 120 characters' } })} />
        </Field>
        <Field label="Link" required error={errors.link} hint="A store path like /products or a full https:// URL" htmlFor="bn-link" className="sm:col-span-2">
          <Input id="bn-link" error={errors.link} placeholder="/products" {...register('link', { required: 'Link is required', pattern: { value: /^(\/[^\s]*|https?:\/\/[^\s]+)$/, message: 'Start with / or https://' } })} />
        </Field>
        <Field label="Position" htmlFor="bn-pos"><Select id="bn-pos" options={BANNER_POSITIONS} {...register('position')} /></Field>
        <Field label="Display Order" required error={errors.order} htmlFor="bn-order" hint="Lower numbers show first">
          <Input id="bn-order" type="number" inputMode="numeric" min={1} step={1} error={errors.order} {...register('order', { validate: (x) => (Number.isInteger(Number(x)) && Number(x) >= 1 && x !== '') || 'Enter a whole number of at least 1' })} />
        </Field>
        <Field label="Status" htmlFor="bn-status"><Select id="bn-status" options={['Active', 'Inactive']} {...register('status')} /></Field>
      </form>
    </Modal>
  )
}

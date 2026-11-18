'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, ImageUploader, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, updateItem } from '@admin/_lib/store'

export default function BrandModal({ brand, onClose }) {
  const isEdit = Boolean(brand?.id)
  const toast = useToast()
  const [logo, setLogo] = useState(brand?.logo || brand?.image || '')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: brand?.name || '',
      slug: brand?.slug || '',
      description: brand?.description || '',
      status: brand?.status || 'Active',
      order: String(brand?.order ?? 1),
    },
  })

  const nameVal = watch('name')

  // Auto-generate slug when creating
  useEffect(() => {
    if (!isEdit && nameVal) {
      const generated = nameVal
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setValue('slug', generated, { shouldValidate: true })
    }
  }, [nameVal, isEdit, setValue])

  const onSubmit = async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim().toLowerCase(),
        description: values.description?.trim() || '',
        status: values.status,
        order: Number(values.order) || 1,
        logo: logo || '',
        image: logo || '',
      }

      if (isEdit) {
        updateItem('brands', brand.id, payload)
        toast.success(`Brand "${payload.name}" updated successfully!`)
      } else {
        createItem('brands', payload, 'brd')
        toast.success(`Brand "${payload.name}" created successfully!`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save brand')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Brand' : 'Add New Brand'}
      subtitle="Manage manufacturer brands (Velum Mayilum, Reshmam, Mayil, Jothi)."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Brand Name" required error={errors.name} htmlFor="brd-name">
          <Input
            id="brd-name"
            placeholder="e.g. Velum Mayilum"
            error={errors.name}
            {...register('name', { required: 'Brand name is required' })}
          />
        </Field>

        <Field label="Slug" required error={errors.slug} htmlFor="brd-slug" hint="Used in brand URLs and filtering">
          <Input
            id="brd-slug"
            placeholder="e.g. velum-mayilum"
            error={errors.slug}
            {...register('slug', { required: 'Slug is required' })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" htmlFor="brd-status">
            <Select id="brd-status" options={['Active', 'Inactive']} {...register('status')} />
          </Field>
          <Field label="Display Order" htmlFor="brd-order">
            <Input id="brd-order" type="number" min="1" {...register('order')} />
          </Field>
        </div>

        <Field label="Description / Heritage" htmlFor="brd-desc">
          <Textarea
            id="brd-desc"
            rows={3}
            placeholder="Brand heritage, background or certification details..."
            {...register('description')}
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink">Brand Logo / Mark</label>
          <ImageUploader
            images={logo ? [logo] : []}
            max={1}
            onChange={(imgs) => setLogo(imgs[0] || '')}
            onError={(m) => toast.error(m)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Brand'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

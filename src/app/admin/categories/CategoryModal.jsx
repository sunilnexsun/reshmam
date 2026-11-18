'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, ImageUploader, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, updateItem } from '@admin/_lib/store'

export default function CategoryModal({ category, onClose }) {
  const isEdit = Boolean(category?.id)
  const toast = useToast()
  const [image, setImage] = useState(category?.image || '')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      status: category?.status || 'Active',
      order: String(category?.order ?? 1),
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
        image: image || '',
      }

      if (isEdit) {
        updateItem('categories', category.id, payload)
        toast.success(`Category "${payload.name}" updated successfully!`)
      } else {
        createItem('categories', payload, 'cat')
        toast.success(`Category "${payload.name}" created successfully!`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save category')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'Add New Category'}
      subtitle="Manage product classification and storefront navigation."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Category Name" required error={errors.name} htmlFor="cat-name">
          <Input
            id="cat-name"
            placeholder="e.g. Gingelly Oil"
            error={errors.name}
            {...register('name', { required: 'Category name is required' })}
          />
        </Field>

        <Field label="Slug" required error={errors.slug} htmlFor="cat-slug" hint="Used in category URLs">
          <Input
            id="cat-slug"
            placeholder="e.g. gingelly-oil"
            error={errors.slug}
            {...register('slug', { required: 'Slug is required' })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" htmlFor="cat-status">
            <Select id="cat-status" options={['Active', 'Inactive']} {...register('status')} />
          </Field>
          <Field label="Display Order" htmlFor="cat-order">
            <Input id="cat-order" type="number" min="1" {...register('order')} />
          </Field>
        </div>

        <Field label="Description" htmlFor="cat-desc">
          <Textarea
            id="cat-desc"
            rows={3}
            placeholder="Short category description for the store..."
            {...register('description')}
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink">Category Banner / Image</label>
          <ImageUploader
            images={image ? [image] : []}
            max={1}
            onChange={(imgs) => setImage(imgs[0] || '')}
            onError={(m) => toast.error(m)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

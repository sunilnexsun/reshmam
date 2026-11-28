'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, ImageUploader, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, updateItem, useDb } from '@admin/_lib/store'

export default function TestimonialModal({ testimonial, onClose }) {
  const isEdit = Boolean(testimonial?.id)
  const db = useDb()
  const toast = useToast()
  const [avatar, setAvatar] = useState(testimonial?.avatar || '')

  const productOptions = ['', ...(db.products || []).map((p) => p.name).filter(Boolean)]

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: testimonial?.name || '',
      rating: String(testimonial?.rating ?? 5),
      product: testimonial?.product || '',
      text: testimonial?.text || testimonial?.quote || '',
      order: String(testimonial?.order ?? 1),
      status: testimonial?.status || 'Active',
    },
  })

  const onSubmit = async (values) => {
    try {
      const text = values.text.trim()
      const payload = {
        name: values.name.trim(),
        rating: Math.min(5, Math.max(1, Number(values.rating) || 5)),
        product: values.product?.trim() || '',
        text,
        quote: text,
        order: Number(values.order) || 1,
        status: values.status || 'Active',
        avatar: avatar || '',
      }

      if (isEdit) {
        updateItem('testimonials', testimonial.id, payload)
        toast.success(`Testimonial from "${payload.name}" updated!`)
      } else {
        createItem('testimonials', payload, 'ts')
        toast.success(`Testimonial from "${payload.name}" added!`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save testimonial')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Testimonial' : 'Add Testimonial'}
      subtitle="Verified customer reviews shown on the storefront."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Customer Name" required error={errors.name} htmlFor="ts-name">
          <Input
            id="ts-name"
            placeholder="e.g. Meenakshi Sundaram"
            error={errors.name}
            {...register('name', { required: 'Customer name is required' })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rating" htmlFor="ts-rating">
            <Select
              id="ts-rating"
              options={[
                { value: '5', label: '5 Stars' },
                { value: '4', label: '4 Stars' },
                { value: '3', label: '3 Stars' },
                { value: '2', label: '2 Stars' },
                { value: '1', label: '1 Star' },
              ]}
              {...register('rating')}
            />
          </Field>
          <Field label="Display Order" htmlFor="ts-order">
            <Input id="ts-order" type="number" min="1" {...register('order')} />
          </Field>
          <Field label="Status" htmlFor="ts-status">
            <Select id="ts-status" options={['Active', 'Inactive']} {...register('status')} />
          </Field>
        </div>

        <Field label="Product Purchased (optional)" htmlFor="ts-product">
          <Input
            id="ts-product"
            list="ts-product-list"
            placeholder="e.g. Traditional Cold Pressed Gingelly Oil"
            {...register('product')}
          />
          <datalist id="ts-product-list">
            {productOptions.filter(Boolean).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>

        <Field label="Customer Review" required error={errors.text} htmlFor="ts-text">
          <Textarea
            id="ts-text"
            rows={4}
            placeholder="Write what the customer shared about the oil quality, aroma, packaging or delivery..."
            error={errors.text}
            {...register('text', { required: 'Review text is required' })}
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink">Customer Photo (optional)</label>
          <ImageUploader
            images={avatar ? [avatar] : []}
            max={1}
            storagePath="testimonials"
            onChange={(imgs) => setAvatar(imgs[0] || '')}
            onError={(m) => toast.error(m)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Save Testimonial'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

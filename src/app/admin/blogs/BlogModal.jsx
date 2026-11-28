'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, ImageUploader, Input, Modal, Select, Textarea, useToast } from '@admin/_components/ui'
import { createItem, updateItem, useDb } from '@admin/_lib/store'

const BLOG_CATEGORIES = ['Cooking Tips', 'Oil Education', 'Wellness', 'Recipes', 'News']
const CUSTOM_CATEGORY_VALUE = '__custom__'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function bodyToText(body) {
  if (!Array.isArray(body) || !body.length) return ''
  return body
    .map((block) => {
      const lines = []
      if (block.heading) lines.push(`## ${block.heading}`)
      if (Array.isArray(block.paragraphs)) lines.push(...block.paragraphs)
      if (Array.isArray(block.list)) lines.push(...block.list.map((li) => `- ${li}`))
      return lines.join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

function textToBody(content) {
  const chunks = String(content || '')
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean)

  return chunks.map((chunk) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    const block = {}
    const rest = []
    for (const line of lines) {
      if (line.startsWith('## ') && !block.heading) {
        block.heading = line.slice(3).trim()
      } else {
        rest.push(line)
      }
    }
    const listItems = rest.filter((l) => l.startsWith('- ') || l.startsWith('* ')).map((l) => l.slice(2).trim())
    const paragraphs = rest.filter((l) => !l.startsWith('- ') && !l.startsWith('* '))
    if (paragraphs.length) block.paragraphs = paragraphs
    if (listItems.length) block.list = listItems
    return block
  })
}

export default function BlogModal({ blog, onClose }) {
  const isEdit = Boolean(blog?.id)
  const db = useDb()
  const toast = useToast()
  const [image, setImage] = useState(blog?.image || '/images/blog-hero.webp')
  const [slugTouched, setSlugTouched] = useState(isEdit)

  const existingCategories = (db.blogs || []).map((b) => String(b.category || '').trim()).filter(Boolean)
  const initialCategory = blog?.category?.trim() || 'Oil Education'
  const categoryOptions = Array.from(new Set([...BLOG_CATEGORIES, ...existingCategories, initialCategory]))
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  const initialContent = blog?.content || bodyToText(blog?.body) || ''
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: blog?.title || '',
      slug: blog?.slug || '',
      category: initialCategory,
      customCategory: '',
      date: blog?.date || today,
      author: blog?.author || 'RESHMAM Editorial',
      status: blog?.status || 'Published',
      excerpt: blog?.excerpt || '',
      imageAlt: blog?.imageAlt || '',
      content: initialContent,
    },
  })

  const titleField = register('title', {
    required: 'Title is required',
    onChange: (e) => {
      if (!slugTouched) {
        setValue('slug', slugify(e.target.value), { shouldValidate: true })
      }
    },
  })

  const slugField = register('slug', {
    required: 'Slug is required',
    onChange: () => setSlugTouched(true),
  })

  const onSubmit = async (values) => {
    try {
      const cleanSlug = slugify(values.slug || values.title)
      if (!cleanSlug) {
        toast.error('Please enter a valid title or slug')
        return
      }
      const chosenCategory = isCustomCategory
        ? String(values.customCategory || '').trim()
        : String(values.category || '').trim()
      if (!chosenCategory) {
        toast.error('Please enter a category name')
        return
      }
      const content = values.content?.trim() || ''
      const payload = {
        title: values.title.trim(),
        slug: cleanSlug,
        category: chosenCategory,
        date: values.date || today,
        author: values.author?.trim() || 'RESHMAM Editorial',
        status: values.status || 'Published',
        excerpt: values.excerpt.trim(),
        image: image || '/images/blog-hero.webp',
        imageAlt: values.imageAlt?.trim() || values.title.trim(),
        content,
        body: textToBody(content),
      }

      if (isEdit) {
        updateItem('blogs', blog.id, payload)
        toast.success(`Article "${payload.title}" updated!`)
      } else {
        createItem('blogs', payload, 'bl')
        toast.success(`Article "${payload.title}" created!`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save blog article')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Blog Article' : 'Create Blog Article'}
      subtitle="Published articles appear immediately on the storefront Blog page."
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Article Title" required error={errors.title} htmlFor="blog-title">
            <Input id="blog-title" placeholder="e.g. Benefits of Cold Pressed Gingelly Oil" error={errors.title} {...titleField} />
          </Field>
          <Field label="URL Slug" required error={errors.slug} htmlFor="blog-slug" hint="Used in /blog/<slug>">
            <Input id="blog-slug" placeholder="e.g. benefits-of-cold-pressed-gingelly-oil" error={errors.slug} {...slugField} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field
            label="Category"
            required={isCustomCategory}
            error={errors.customCategory}
            htmlFor={isCustomCategory ? 'blog-custom-category' : 'blog-category'}
          >
            {isCustomCategory ? (
              <div className="flex gap-1.5">
                <Input
                  id="blog-custom-category"
                  placeholder="Enter category..."
                  autoFocus
                  error={errors.customCategory}
                  {...register('customCategory', {
                    validate: (v) => !isCustomCategory || Boolean(String(v || '').trim()) || 'Category is required',
                  })}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(false)
                    setValue('category', initialCategory)
                    setValue('customCategory', '')
                  }}
                  title="Choose from existing categories"
                  className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink"
                >
                  List
                </button>
              </div>
            ) : (
              <Select
                id="blog-category"
                options={[
                  ...categoryOptions.map((c) => ({ value: c, label: c })),
                  { value: CUSTOM_CATEGORY_VALUE, label: '+ Add custom category...' },
                ]}
                {...register('category', {
                  onChange: (e) => {
                    if (e.target.value === CUSTOM_CATEGORY_VALUE) {
                      setIsCustomCategory(true)
                    }
                  },
                })}
              />
            )}
          </Field>
          <Field label="Publish Date" htmlFor="blog-date">
            <Input id="blog-date" type="date" {...register('date')} />
          </Field>
          <Field label="Author" htmlFor="blog-author">
            <Input id="blog-author" placeholder="RESHMAM Editorial" {...register('author')} />
          </Field>
          <Field label="Status" htmlFor="blog-status">
            <Select id="blog-status" options={['Published', 'Draft']} {...register('status')} />
          </Field>
        </div>

        <Field label="Short Excerpt" required error={errors.excerpt} htmlFor="blog-excerpt">
          <Textarea
            id="blog-excerpt"
            rows={2}
            placeholder="Brief 1-2 sentence summary shown on blog cards..."
            error={errors.excerpt}
            {...register('excerpt', { required: 'Excerpt is required' })}
          />
        </Field>

        <Field
          label="Article Content"
          required
          error={errors.content}
          htmlFor="blog-content"
          hint="Separate paragraphs with a blank line. Start a line with ## for a heading, or - for bullet points."
        >
          <Textarea
            id="blog-content"
            rows={8}
            placeholder={'Write your article here...\n\n## Section Heading\nAdd detailed tips or explanation.\n\n- Key takeaway 1\n- Key takeaway 2'}
            error={errors.content}
            {...register('content', { required: 'Article content is required' })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">Cover Image</label>
            <ImageUploader
              images={image ? [image] : []}
              max={1}
              storagePath="blogs"
              onChange={(imgs) => setImage(imgs[0] || '')}
              onError={(m) => toast.error(m)}
            />
          </div>
          <Field label="Image Alt Text" htmlFor="blog-alt" hint="Accessibility description for the cover photo">
            <Input id="blog-alt" placeholder="Describe the cover photo" {...register('imageAlt')} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Publish Article'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

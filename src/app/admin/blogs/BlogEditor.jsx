'use client'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  Calendar,
  Check,
  Eye,
  Link2,
  Loader2,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Link, useNavigate } from '@admin/_lib/navigation'
import { uploadProductImage } from '@admin/_lib/firebase'
import { createItem, updateItem, useDb } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { Button, Field, Input, Select, Textarea, useToast } from '@admin/_components/ui'
import NotFound from '@admin/_components/NotFound'
import { bodyToHtml, htmlToPlainText, parseBlogContent } from '@storefront/_lib/blog'
import RichContentEditor from './RichContentEditor'
import BlogPreviewModal from './BlogPreviewModal'

const BLOG_CATEGORIES = ['Cooking Tips', 'Oil Education', 'Wellness', 'Recipes', 'News', 'Skin Care']
const CUSTOM_CATEGORY_VALUE = '__custom__'
const DEFAULT_COVER = '/images/blog-hero.webp'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getInitialHtml(blog) {
  if (!blog) return ''
  if (blog.htmlContent) return blog.htmlContent
  if (Array.isArray(blog.body) && blog.body.length > 0) return bodyToHtml(blog.body)
  if (blog.content) return bodyToHtml(parseBlogContent(blog.content))
  return ''
}

export default function BlogEditor({ blogId = undefined }) {
  const db = useDb()
  const toast = useToast()
  const navigate = useNavigate()
  const { can } = useAuth()
  const canManage = can('marketing', 'manage')

  const existingBlog = blogId ? (db.blogs || []).find((b) => b.id === blogId) : null
  const isEdit = Boolean(blogId)

  if (isEdit && !existingBlog) {
    return (
      <NotFound
        title="Blog article not found"
        text="This article may have been deleted or the URL is invalid."
        back="/blogs"
        backLabel="Back to Blogs"
      />
    )
  }

  return (
    <BlogEditorForm
      key={existingBlog?.id || 'new'}
      blog={existingBlog}
      allBlogs={db.blogs || []}
      canManage={canManage}
      toast={toast}
      navigate={navigate}
    />
  )
}

function BlogEditorForm({ blog, allBlogs, canManage, toast, navigate }) {
  const isEdit = Boolean(blog?.id)
  const editorRef = useRef(null)
  const coverInputRef = useRef(null)

  const today = new Date().toISOString().slice(0, 10)
  const initialCategory = String(blog?.category || 'Oil Education').trim() || 'Oil Education'
  const existingCategories = allBlogs.map((b) => String(b.category || '').trim()).filter(Boolean)
  const categoryOptions = Array.from(new Set([...BLOG_CATEGORIES, ...existingCategories, initialCategory]))

  const [image, setImage] = useState(blog?.image || DEFAULT_COVER)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [tags, setTags] = useState(Array.isArray(blog?.tags) ? blog.tags : [])
  const [tagInput, setTagInput] = useState('')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [statusValue, setStatusValue] = useState(blog?.status || 'Published')
  const [stats, setStats] = useState({ words: 0, mins: 0 })
  const [previewPost, setPreviewPost] = useState(null)
  const [savingMode, setSavingMode] = useState(null) // 'Draft' | 'Published' | null
  const [metaCounts, setMetaCounts] = useState({
    title: (blog?.seo?.metaTitle || '').length,
    desc: (blog?.seo?.metaDescription || '').length,
  })

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: blog?.title || '',
      slug: blog?.slug || '',
      excerpt: blog?.excerpt || '',
      category: initialCategory,
      customCategory: '',
      author: blog?.author || 'Reshmam',
      metaTitle: blog?.seo?.metaTitle || '',
      metaDescription: blog?.seo?.metaDescription || '',
      focusKeyword: blog?.seo?.focusKeyword || '',
      imageAlt: blog?.imageAlt || '',
      status: blog?.status || 'Published',
      date: blog?.date ? String(blog.date).slice(0, 10) : today,
    },
  })

  const titleField = register('title', {
    required: 'Blog title is required',
    onChange: (e) => {
      if (!slugTouched) {
        setValue('slug', slugify(e.target.value), { shouldValidate: false })
      }
    },
  })

  const slugField = register('slug', {
    required: 'URL slug is required',
    onChange: () => setSlugTouched(true),
  })

  const addTag = (raw) => {
    const clean = String(raw || '').replace(/,/g, '').trim()
    if (!clean) return
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagInput('')
      return
    }
    setTags([...tags, clean])
    setTagInput('')
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingCover(true)
    try {
      const url = await uploadProductImage(file, { pathPrefix: 'blogs', maxSizeMB: 2 })
      setImage(url)
      toast.success('Featured image uploaded to Firebase Storage')
    } catch (err) {
      toast.error(err?.message || 'Failed to upload image')
    } finally {
      setUploadingCover(false)
    }
  }

  const openPreview = () => {
    const v = getValues()
    const htmlContent = editorRef.current?.getHtml() || ''
    const chosenCategory = isCustomCategory
      ? String(v.customCategory || '').trim() || 'Oil Education'
      : String(v.category || 'Oil Education').trim()
    setPreviewPost({
      title: v.title?.trim() || 'Untitled Blog Article',
      slug: slugify(v.slug || v.title || 'preview'),
      excerpt: v.excerpt?.trim() || '',
      category: chosenCategory,
      tags,
      author: v.author?.trim() || 'Reshmam',
      date: v.date || today,
      status: statusValue,
      image: image || DEFAULT_COVER,
      imageAlt: v.imageAlt?.trim() || v.title?.trim() || '',
      htmlContent,
      seo: {
        metaTitle: v.metaTitle?.trim() || '',
        metaDescription: v.metaDescription?.trim() || '',
        focusKeyword: v.focusKeyword?.trim() || '',
      },
    })
  }

  const submitWithStatus = (forcedStatus) =>
    handleSubmit((values) => {
      if (!canManage) {
        toast.error('You do not have permission to edit blogs')
        return
      }

      const cleanSlug = slugify(values.slug || values.title)
      if (!cleanSlug) {
        toast.error('Please enter a valid blog title or URL slug')
        return
      }

      const duplicateSlug = allBlogs.find((b) => b.slug === cleanSlug && b.id !== blog?.id)
      if (duplicateSlug) {
        toast.error(`Slug "/blog/${cleanSlug}" is already used by "${duplicateSlug.title}"`)
        return
      }

      const chosenCategory = isCustomCategory
        ? String(values.customCategory || '').trim()
        : String(values.category || '').trim()
      if (!chosenCategory) {
        toast.error('Please select or enter a category')
        return
      }

      const htmlContent = editorRef.current?.getHtml() || ''
      const plainText = htmlToPlainText(htmlContent)
      if (!plainText && !/<img\b/i.test(htmlContent)) {
        toast.error('Please write some blog content before saving')
        editorRef.current?.focus()
        return
      }

      const finalStatus = forcedStatus || values.status || statusValue || 'Published'
      setSavingMode(finalStatus)

      try {
        const payload = {
          title: values.title.trim(),
          slug: cleanSlug,
          excerpt: values.excerpt.trim(),
          category: chosenCategory,
          tags,
          author: values.author?.trim() || 'Reshmam',
          date: values.date || today,
          status: finalStatus,
          image: image || DEFAULT_COVER,
          imageAlt: values.imageAlt?.trim() || values.title.trim(),
          htmlContent,
          content: plainText,
          body: parseBlogContent(plainText),
          seo: {
            metaTitle: values.metaTitle?.trim() || values.title.trim(),
            metaDescription: values.metaDescription?.trim() || values.excerpt.trim(),
            focusKeyword: values.focusKeyword?.trim() || '',
          },
        }

        if (isEdit) {
          updateItem('blogs', blog.id, payload)
          if (finalStatus === 'Draft') {
            setStatusValue('Draft')
            setValue('status', 'Draft')
            toast.success(`"${payload.title}" saved as draft`)
          } else {
            toast.success(`"${payload.title}" updated & published!`)
            navigate('/blogs')
          }
        } else {
          const created = createItem('blogs', payload, 'bl')
          if (finalStatus === 'Draft') {
            toast.success(`Draft "${payload.title}" saved`)
            navigate(`/blogs/${created.id}`, { replace: true })
          } else {
            toast.success(`"${payload.title}" published!`)
            navigate('/blogs')
          }
        }
      } catch (err) {
        toast.error(err?.message || 'Failed to save blog article')
      } finally {
        setSavingMode(null)
      }
    })()

  return (
    <div className="space-y-5">
      {/* Top Action Bar matching screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {isEdit ? 'Edit Blog' : 'Create Blog'}
            </h1>
            {stats.words > 0 && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line">
                {stats.words} words · {stats.mins} min read
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="outline" icon={Eye} onClick={openPreview}>
            Preview
          </Button>
          {canManage && (
            <>
              <Button
                type="button"
                variant="outline"
                icon={Save}
                loading={savingMode === 'Draft'}
                onClick={() => submitWithStatus('Draft')}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                icon={Check}
                loading={savingMode === 'Published'}
                onClick={() => submitWithStatus('Published')}
              >
                {isEdit ? 'Update & Publish' : 'Publish Blog'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* Left Column: Blog Details + Rich Content Editor */}
        <div className="min-w-0 space-y-5">
          <div className="card space-y-4 p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Blog Details</h2>

            <Field label="Blog Title" required error={errors.title} htmlFor="blog-title">
              <Input
                id="blog-title"
                placeholder="e.g. Coconut Oil for Skin Care – A Simple Traditional Routine"
                error={errors.title}
                {...titleField}
              />
            </Field>

            <Field label="URL Slug" required error={errors.slug} htmlFor="blog-slug">
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-xs font-medium text-muted">
                  /blog/
                </span>
                <Input
                  id="blog-slug"
                  placeholder="coconut-oil-for-skin-care"
                  className="pl-14 pr-9 font-mono text-xs"
                  error={errors.slug}
                  {...slugField}
                />
                <Link2 className="pointer-events-none absolute right-3 h-4 w-4 text-muted" />
              </div>
            </Field>

            <Field label="Short Description" required error={errors.excerpt} htmlFor="blog-excerpt">
              <Textarea
                id="blog-excerpt"
                rows={3}
                placeholder="Write a clear 1-2 sentence summary shown on blog cards and search snippets..."
                error={errors.excerpt}
                {...register('excerpt', { required: 'Short description is required' })}
              />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-[13px] font-medium text-ink">
                  Blog Content <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-muted">
                  Rich editor · Inline images upload directly to Firebase Storage
                </span>
              </div>
              <RichContentEditor
                editorRef={editorRef}
                editorKey={blog?.id || 'new'}
                initialHtml={getInitialHtml(blog)}
                onStatsChange={setStats}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Featured Image, Category, Tags, Author, SEO, Publish */}
        <div className="space-y-5">
          {/* Card 1: Featured Image + Taxonomy */}
          <div className="card space-y-4 p-5">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-ink">
                Featured Image <span className="text-red-500">*</span>
              </label>
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                <img
                  src={image || DEFAULT_COVER}
                  alt="Featured blog cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = DEFAULT_COVER
                  }}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-60"
                >
                  {uploadingCover ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Change Image
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setImage(DEFAULT_COVER)}
                  title="Reset to default cover"
                  aria-label="Reset featured image"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleCoverUpload}
              />
            </div>

            <Field
              label="Category"
              required
              error={errors.customCategory}
              htmlFor={isCustomCategory ? 'blog-custom-category' : 'blog-category'}
            >
              {isCustomCategory ? (
                <div className="flex gap-1.5">
                  <Input
                    id="blog-custom-category"
                    placeholder="Type new category…"
                    autoFocus
                    error={errors.customCategory}
                    {...register('customCategory', {
                      validate: (v) =>
                        !isCustomCategory || Boolean(String(v || '').trim()) || 'Category is required',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false)
                      setValue('category', initialCategory)
                      setValue('customCategory', '')
                    }}
                    className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
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

            <div>
              <label htmlFor="blog-tags-input" className="mb-1.5 block text-[13px] font-medium text-ink">
                Tags
              </label>
              <div className="rounded-lg border border-line bg-white p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                {tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          aria-label={`Remove tag ${t}`}
                          className="rounded-full p-0.5 text-primary/70 hover:bg-white/60 hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  id="blog-tags-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  placeholder="Add tag and press Enter"
                  className="w-full bg-transparent px-1 text-sm text-ink outline-none placeholder:text-muted/70"
                />
              </div>
            </div>

            <Field label="Author" htmlFor="blog-author">
              <Input id="blog-author" placeholder="Reshmam" {...register('author')} />
            </Field>
          </div>

          {/* Card 2: SEO Settings */}
          <div className="card space-y-3.5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                <Search className="h-4 w-4 text-primary" />
                SEO Settings
              </h2>
              <button
                type="button"
                onClick={() => {
                  const v = getValues()
                  if (v.title) {
                    const mt = `${v.title.trim()} | RESHMAM`
                    setValue('metaTitle', mt)
                    setMetaCounts((c) => ({ ...c, title: mt.length }))
                  }
                  if (v.excerpt) {
                    const md = v.excerpt.trim().slice(0, 160)
                    setValue('metaDescription', md)
                    setMetaCounts((c) => ({ ...c, desc: md.length }))
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Auto-fill
              </button>
            </div>

            <Field
              label={`Meta Title (${metaCounts.title}/60)`}
              htmlFor="blog-meta-title"
            >
              <Input
                id="blog-meta-title"
                placeholder="Defaults to Blog Title"
                {...register('metaTitle', {
                  onChange: (e) => setMetaCounts((c) => ({ ...c, title: e.target.value.length })),
                })}
              />
            </Field>

            <Field
              label={`Meta Description (${metaCounts.desc}/160)`}
              htmlFor="blog-meta-desc"
            >
              <Textarea
                id="blog-meta-desc"
                rows={3}
                placeholder="Defaults to Short Description"
                {...register('metaDescription', {
                  onChange: (e) => setMetaCounts((c) => ({ ...c, desc: e.target.value.length })),
                })}
              />
            </Field>

            <Field label="Focus Keyword" htmlFor="blog-focus-kw">
              <Input id="blog-focus-kw" placeholder="e.g. Coconut Oil for Skin Care" {...register('focusKeyword')} />
            </Field>

            <Field label="Image Alt Text" htmlFor="blog-alt">
              <Input id="blog-alt" placeholder="Reshmam Cold Pressed Oil…" {...register('imageAlt')} />
            </Field>
          </div>

          {/* Card 3: Publish Settings */}
          <div className="card space-y-3.5 p-5">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
              <Calendar className="h-4 w-4 text-primary" />
              Publish Settings
            </h2>

            <Field label="Status" htmlFor="blog-status">
              <div className="relative">
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${
                    statusValue === 'Published' ? 'bg-green-600' : 'bg-amber-500'
                  }`}
                />
                <Select
                  id="blog-status"
                  className="pl-8"
                  options={['Published', 'Draft']}
                  {...register('status', {
                    onChange: (e) => setStatusValue(e.target.value),
                  })}
                />
              </div>
            </Field>

            <Field label="Publish Date" htmlFor="blog-date">
              <Input id="blog-date" type="date" {...register('date')} />
            </Field>
          </div>
        </div>
      </div>

      {previewPost && (
        <BlogPreviewModal post={previewPost} onClose={() => setPreviewPost(null)} />
      )}
    </div>
  )
}

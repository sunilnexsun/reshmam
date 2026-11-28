'use client'
import { Calendar, Eye, Tag, User } from 'lucide-react'
import { Modal } from '@admin/_components/ui'
import { formatDate, sanitizeBlogHtml } from '@storefront/_lib/blog'

export default function BlogPreviewModal({ post, onClose }) {
  if (!post) return null
  const safeHtml = sanitizeBlogHtml(post.htmlContent || '')

  return (
    <Modal
      open
      onClose={onClose}
      title="Storefront Article Preview"
      subtitle={`/blog/${post.slug || 'preview-slug'}`}
      size="lg"
    >
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {/* Article Preview */}
        <article className="rounded-xl border border-line bg-[#fdfbf6] p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-bold uppercase tracking-wider text-amber-700">
              {post.category || 'Oil Education'}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {post.date ? formatDate(post.date) : 'Today'}
            </span>
            {post.author && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {post.author}
                </span>
              </>
            )}
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink ring-1 ring-line">
              <Eye className="h-3 w-3 text-accent" />
              {post.status || 'Draft'}
            </span>
          </div>

          <h1 className="mt-3 font-serif text-2xl font-bold leading-tight text-primary sm:text-3xl">
            {post.title || 'Untitled Article'}
          </h1>

          {post.excerpt && (
            <p className="mt-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>
          )}

          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  <Tag className="h-3 w-3" />
                  {t}
                </span>
              ))}
            </div>
          )}

          {post.image && (
            <img
              src={post.image}
              alt={post.imageAlt || post.title}
              className="mt-5 aspect-[21/9] w-full rounded-xl object-cover"
            />
          )}

          <div
            className="blog-prose mt-6 text-ink"
            dangerouslySetInnerHTML={{
              __html: safeHtml || '<p class="text-muted">No article content added yet.</p>',
            }}
          />
        </article>

        {/* Google Search / SEO Preview */}
        <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Search Engine Snippet Preview
          </p>
          <p className="truncate text-base font-medium text-[#1a0dab]">
            {post.seo?.metaTitle || post.title || 'Blog Article Title'}
          </p>
          <p className="truncate text-xs text-[#006621]">
            https://reshmam.com/blog/{post.slug || 'article-slug'}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted">
            {post.seo?.metaDescription || post.excerpt || 'Short description shown in search results.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

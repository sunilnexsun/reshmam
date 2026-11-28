'use client'
import { useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, Download, ExternalLink, FileText, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { Button, Card, DataTable, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, StatCard, StatusBadge, useConfirm, useToast } from '@admin/_components/ui'
import { useDb, removeItem, updateItem } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { useNavigate } from '@admin/_lib/navigation'
import { date as formatDate, num } from '@admin/_lib/format'
import { exportCSV } from '@admin/_lib/export'

const CATEGORIES = ['Cooking Tips', 'Oil Education', 'Wellness', 'Recipes', 'News', 'Skin Care']

export default function BlogList() {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { can } = useAuth()
  const canManage = can('marketing', 'manage')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const blogs = useMemo(() => {
    const list = Array.isArray(db.blogs) ? db.blogs : []
    return [...list].sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
  }, [db.blogs])

  const categories = useMemo(() => {
    const set = new Set([...CATEGORIES, ...blogs.map((b) => b.category).filter(Boolean)])
    return Array.from(set)
  }, [blogs])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return blogs.filter((b) => {
      const status = b.status || 'Published'
      const matchStatus = statusFilter === 'all' || status === statusFilter
      const matchCat = categoryFilter === 'all' || b.category === categoryFilter
      const matchSearch =
        !s ||
        b.title?.toLowerCase().includes(s) ||
        b.slug?.toLowerCase().includes(s) ||
        b.author?.toLowerCase().includes(s) ||
        b.excerpt?.toLowerCase().includes(s)
      return matchStatus && matchCat && matchSearch
    })
  }, [blogs, search, statusFilter, categoryFilter])

  const totals = useMemo(() => {
    const published = blogs.filter((b) => (b.status || 'Published') === 'Published').length
    const usedCategories = new Set(blogs.map((b) => b.category).filter(Boolean)).size
    return {
      total: blogs.length,
      published,
      drafts: blogs.length - published,
      usedCategories,
    }
  }, [blogs])

  const toggleStatus = (blog) => {
    const current = blog.status || 'Published'
    const nextStatus = current === 'Published' ? 'Draft' : 'Published'
    updateItem('blogs', blog.id, { status: nextStatus })
    toast.success(`"${blog.title}" marked as ${nextStatus}`)
  }

  const handleDelete = async (blog) => {
    const ok = await confirm({
      title: `Delete "${blog.title}"?`,
      message: 'This blog article will be permanently removed from the website and Firestore.',
      confirmText: 'Delete Article',
      danger: true,
    })
    if (!ok) return
    removeItem('blogs', blog.id)
    toast.success(`Deleted "${blog.title}"`)
  }

  const onExport = () => {
    exportCSV(`reshmam-blogs-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { label: 'Title', key: 'title' },
      { label: 'Slug', key: 'slug' },
      { label: 'Category', key: 'category' },
      { label: 'Author', key: 'author' },
      { label: 'Date', key: 'date' },
      { label: 'Status', key: 'status' },
      { label: 'Excerpt', key: 'excerpt' },
    ])
    toast.success(`Exported ${filtered.length} articles`)
  }

  const columns = [
    {
      key: 'title',
      label: 'Article',
      sortable: true,
      render: (b) => (
        <div className="flex items-center gap-3">
          {b.image ? (
            <img
              src={b.image}
              alt={b.imageAlt || b.title}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/images/blog-hero.webp'
              }}
              className="h-11 w-16 shrink-0 rounded-lg object-cover ring-1 ring-line"
            />
          ) : (
            <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
              <FileText className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="max-w-xs truncate font-semibold text-ink">{b.title}</p>
            <p className="max-w-xs truncate font-mono text-xs text-muted">/blog/{b.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (b) => <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-ink">{b.category || 'General'}</span>,
    },
    {
      key: 'date',
      label: 'Published Date',
      sortable: true,
      render: (b) => <span className="whitespace-nowrap text-sm text-ink">{b.date ? formatDate(b.date) : '—'}</span>,
    },
    {
      key: 'author',
      label: 'Author',
      render: (b) => <span className="text-xs text-muted">{b.author || 'RESHMAM Editorial'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (b) => <StatusBadge status={b.status || 'Published'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          {(b.status || 'Published') === 'Published' && b.slug && (
            <a
              href={`/blog/${b.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${b.title} on site`}
              title="View on storefront"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {canManage && (
            <>
              <IconButton icon={Pencil} label={`Edit ${b.title}`} size="sm" variant="primary" onClick={() => navigate(`/blogs/${b.id}`)} />
              <IconButton
                icon={Power}
                label={(b.status || 'Published') === 'Published' ? `Move ${b.title} to Draft` : `Publish ${b.title}`}
                size="sm"
                onClick={() => toggleStatus(b)}
              />
              <IconButton icon={Trash2} label={`Delete ${b.title}`} size="sm" variant="danger" onClick={() => handleDelete(b)} />
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Blog Articles"
        subtitle="Create, edit, publish and manage articles shown on the storefront Blog page."
        breadcrumbs={[{ label: 'Blogs' }]}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={onExport}>
              Export CSV
            </Button>
            {canManage && (
              <Button icon={Plus} onClick={() => navigate('/blogs/new')}>
                New Article
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Articles" value={num(totals.total)} icon={FileText} hint="Synced with Firestore" />
        <StatCard label="Published" value={num(totals.published)} icon={CheckCircle2} tone="green" hint="Live on /blog" />
        <StatCard label="Drafts" value={num(totals.drafts)} icon={FileText} tone="gray" hint="Hidden from storefront" />
        <StatCard label="Categories" value={num(totals.usedCategories)} icon={BookOpen} tone="blue" hint="Topics covered" />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search title, slug or author..." className="w-full md:max-w-xs" />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            allLabel="All Categories"
            options={categories}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="All Statuses"
            options={['Published', 'Draft']}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No blog articles found"
            text={search ? 'Try adjusting your search or filters.' : 'Create your first article to publish it on the storefront Blog page.'}
            action={
              canManage && !search ? (
                <Button icon={Plus} onClick={() => navigate('/blogs/new')}>
                  New Article
                </Button>
              ) : null
            }
          />
        ) : (
          <DataTable columns={columns} rows={filtered} />
        )}
      </Card>
    </>
  )
}

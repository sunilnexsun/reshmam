import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpDown, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImagePlus, Inbox, Loader2, Star, Trash2 } from 'lucide-react'
import { cn } from '@admin/_lib/format'
import { fileToDataUrl } from '@admin/_lib/image'
import { uploadProductImage } from '@admin/_lib/firebase'
import { RANGE_PRESETS } from '@admin/_lib/dateRange'
import { EmptyState, FilterSelect } from './basic'

// ---------------------------------------------------------------- Pagination
export function Pagination({ page, pageCount, onChange, total, pageSize, onPageSize }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = []
  for (let p = Math.max(1, page - 2); p <= Math.min(pageCount, page + 2); p++) pages.push(p)
  return (
    <div className="no-print flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted sm:flex-row">
      <div className="flex items-center gap-3">
        <span>Showing <b className="text-ink">{from}–{to}</b> of <b className="text-ink">{total}</b></span>
        {onPageSize && (
          <select aria-label="Rows per page" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="input h-8 w-auto pr-7 text-xs">
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
      </div>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        {pages[0] > 1 && <><PageBtn p={1} page={page} onChange={onChange} />{pages[0] > 2 && <span className="px-1">…</span>}</>}
        {pages.map((p) => <PageBtn key={p} p={p} page={page} onChange={onChange} />)}
        {pages.at(-1) < pageCount && <>{pages.at(-1) < pageCount - 1 && <span className="px-1">…</span>}<PageBtn p={pageCount} page={page} onChange={onChange} /></>}
        <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onChange(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </nav>
    </div>
  )
}
const PageBtn = ({ p, page, onChange }) => (
  <button type="button" aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}
    className={cn('h-8 min-w-8 rounded-lg px-2 font-medium', p === page ? 'bg-primary text-white' : 'border border-line bg-white text-ink hover:bg-surface')}>{p}</button>
)

// ---------------------------------------------------------------- DataTable
/**
 * columns: [{ key, label, render?(row), sortable?, sortValue?(row), className?, headerClassName?, align?: 'right'|'center' }]
 * Sorting + pagination are built in; pass already-filtered `rows`. Resets to page 1 when rows change length.
 * selectable + selected/onSelect for bulk actions.
 */
export function DataTable({ columns = [], rows, data, rowKey = 'id', pageSize: initialSize = 10, onRowClick, empty, initialSort, selectable, selected = [], onSelect, className, dense, footer }) {
  const rowList = rows ?? data ?? []
  const [sort, setSort] = useState(initialSort || null) // { key, dir }
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialSize)
  const lastLen = useRef(rowList.length)
  useEffect(() => { if (lastLen.current !== rowList.length) { lastLen.current = rowList.length; setPage(1) } }, [rowList.length])

  const sorted = useMemo(() => {
    if (!sort) return rowList
    const col = columns?.find((c) => c.key === sort.key)
    const get = col?.sortValue || ((r) => r[sort.key])
    return [...rowList].sort((a, b) => {
      const x = get(a), y = get(b)
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'en', { numeric: true })
      return sort.dir === 'asc' ? r : -r
    })
  }, [rowList, sort, columns])
  const pageCount = Math.max(1, Math.ceil(sorted.length / size))
  const cur = Math.min(page, pageCount)
  const pageRows = sorted.slice((cur - 1) * size, cur * size)
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.includes(r[rowKey]))

  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  const al = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '')

  return (
    <div className={cn('min-w-0', className)}>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface/60">
            <tr>
              {selectable && (
                <th className="w-10 px-4"><input type="checkbox" aria-label="Select all on page" checked={allOnPage} className="h-4 w-4 accent-[#16a34a]"
                  onChange={() => onSelect(allOnPage ? selected.filter((id) => !pageRows.some((r) => r[rowKey] === id)) : [...new Set([...selected, ...pageRows.map((r) => r[rowKey])])])} /></th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('th', al(c.align), c.headerClassName)} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 uppercase hover:text-ink', c.align === 'right' && 'flex-row-reverse')}>
                      {c.label}
                      {sort?.key === c.key ? (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.map((r) => (
              <tr key={r[rowKey]} onClick={onRowClick ? (e) => { if (!e.target.closest('button,a,input,select,label')) onRowClick(r) } : undefined}
                className={cn('transition-colors hover:bg-surface/60', onRowClick && 'cursor-pointer', selected.includes(r[rowKey]) && 'bg-accent-soft/40')}>
                {selectable && <td className="px-4"><input type="checkbox" aria-label="Select row" className="h-4 w-4 accent-[#16a34a]" checked={selected.includes(r[rowKey])} onChange={() => onSelect(selected.includes(r[rowKey]) ? selected.filter((x) => x !== r[rowKey]) : [...selected, r[rowKey]])} /></td>}
                {columns.map((c) => <td key={c.key} className={cn(dense ? 'px-4 py-2' : 'td', al(c.align), c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
          {footer}
        </table>
      </div>
      {rowList.length === 0 && (empty || <EmptyState icon={Inbox} title="No records found" text="Try changing the search or filters." />)}
      <Pagination page={cur} pageCount={pageCount} onChange={setPage} total={sorted.length} pageSize={size} onPageSize={(n) => { setSize(n); setPage(1) }} />
    </div>
  )
}

// ---------------------------------------------------------------- Tabs
/** tabs: [{ value, label, icon?, count? }] */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('scroll-thin -mb-px flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn('inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition',
            value === t.value ? 'border-accent text-primary' : 'border-transparent text-muted hover:text-ink')}>
          {t.icon && <t.icon className="h-4 w-4" />}{t.label}
          {t.count != null && <span className={cn('rounded-full px-1.5 py-px text-[11px]', value === t.value ? 'bg-accent-soft text-primary' : 'bg-surface text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- StatCard
const ICON_TONE = { primary: 'bg-accent-soft text-primary', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-violet-50 text-violet-600', red: 'bg-red-50 text-red-600', teal: 'bg-teal-50 text-teal-600' }
export function StatCard({ label, value, change, changeLabel = 'vs previous period', icon: Icon, tone = 'primary', hint, onClick }) {
  const up = change >= 0
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cn('card flex w-full min-w-0 items-start gap-4 p-5 text-left', onClick && 'transition hover:border-accent/50 hover:shadow-md')}>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
        {change != null && Number.isFinite(change) ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
            <span className={cn('inline-flex items-center font-semibold', up ? 'text-accent' : 'text-red-600')}>
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-muted">{changeLabel}</span>
          </p>
        ) : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {Icon && <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', ICON_TONE[tone])}><Icon className="h-5 w-5" /></div>}
    </Tag>
  )
}

// ---------------------------------------------------------------- ImageUploader
/** images: string[] (URLs / Firebase Storage URLs); primary: index. Max 4 images, size limit enforced. */
export function ImageUploader({
  images = [],
  onChange,
  primary = 0,
  onPrimary,
  max = 4,
  maxSizeMB = 2,
  storagePath = 'products',
  onError,
}) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [statusText, setStatusText] = useState('')

  const add = async (files) => {
    const fileArray = Array.from(files || [])
    if (!fileArray.length) return

    if (images.length >= max) {
      return onError?.(`Maximum ${max} image${max > 1 ? 's' : ''} allowed. Please remove an existing image first.`)
    }

    const availableSlots = max - images.length
    const list = fileArray.slice(0, availableSlots)
    if (fileArray.length > availableSlots) {
      onError?.(`Only ${availableSlots} more image${availableSlots > 1 ? 's' : ''} can be added (max ${max}).`)
    }

    // Strict size verification
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    for (const f of list) {
      if (!f.type.startsWith('image/')) {
        return onError?.(`"${f.name}" is not an image file. Please choose JPG, PNG, or WebP.`)
      }
      if (f.size > maxSizeBytes) {
        return onError?.(`"${f.name}" exceeds the ${maxSizeMB} MB size limit (${(f.size / (1024 * 1024)).toFixed(1)} MB). Please select an image under ${maxSizeMB} MB.`)
      }
    }

    setBusy(true)
    setStatusText('Uploading…')
    try {
      const urls = []
      for (const f of list) {
        try {
          const downloadUrl = await uploadProductImage(f, { pathPrefix: storagePath, maxSizeMB })
          urls.push(downloadUrl)
        } catch (storageErr) {
          console.warn('Firebase Storage upload notice, falling back to optimized data URL:', storageErr)
          const localUrl = await fileToDataUrl(f, 900, 0.82)
          urls.push(localUrl)
        }
      }
      onChange([...images, ...urls])
    } catch (e) {
      onError?.(e.message || 'Error processing image')
    } finally {
      setBusy(false)
      setStatusText('')
      if (input.current) input.current.value = ''
    }
  }

  const remove = (i) => {
    onChange(images.filter((_, j) => j !== i))
    if (onPrimary) onPrimary(i === primary ? 0 : i < primary ? primary - 1 : primary)
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={i} className={cn('group relative aspect-square overflow-hidden rounded-xl border-2 bg-surface', i === primary ? 'border-accent shadow-sm' : 'border-line')}>
            <img src={src} alt={`Product image ${i + 1}`} className="h-full w-full object-contain p-1" />
            {i === primary && (
              <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                Primary
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
              {onPrimary && i !== primary && (
                <button type="button" onClick={() => onPrimary(i)} aria-label={`Set image ${i + 1} as primary`} title="Set as primary" className="rounded bg-white/90 p-1 text-amber-600 hover:bg-white">
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={() => remove(i)} aria-label={`Remove image ${i + 1}`} title="Remove" className="rounded bg-white/90 p-1 text-red-600 hover:bg-white">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs text-muted transition hover:border-accent hover:text-primary',
              drag ? 'border-accent bg-accent-soft' : 'border-line',
              busy ? 'cursor-not-allowed opacity-75' : ''
            )}
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <ImagePlus className="h-6 w-6" />}
            <span className="font-medium">{busy ? (statusText || 'Uploading…') : `Add Image (${images.length}/${max})`}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <p className="mt-2 text-xs text-muted">
        JPG, PNG or WebP · Max <b>{max} images</b> · Up to <b>{maxSizeMB} MB</b> each · Uploads to Firebase Storage.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- Date range filter
/** value: { preset, from, to } (from/to as yyyy-mm-dd for custom) */
export function DateRangeFilter({ value, onChange, presets = RANGE_PRESETS, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <FilterSelect label="Date range" value={value.preset} onChange={(preset) => onChange({ ...value, preset })} options={presets} />
      {value.preset === 'custom' && (
        <>
          <input type="date" aria-label="From date" value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className="input h-9 w-auto text-[13px]" />
          <span className="text-xs text-muted">to</span>
          <input type="date" aria-label="To date" value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className="input h-9 w-auto text-[13px]" />
        </>
      )}
    </div>
  )
}

/** Segmented control: options [{value,label}] */
export function Segmented({ options, value, onChange, className, size = 'sm' }) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-lg border border-line bg-surface p-0.5', className)}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn('rounded-md font-medium transition', size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm', value === v ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink')}>{l}</button>
      })}
    </div>
  )
}

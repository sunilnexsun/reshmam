import { forwardRef, useId } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Loader2, Search, X } from 'lucide-react'
import { cn, initials } from '../../utils/format'

// ---------------------------------------------------------------- Button
const BTN = {
  primary: 'bg-primary text-white hover:bg-primary-light shadow-sm',
  accent: 'bg-accent text-white hover:bg-green-700 shadow-sm',
  secondary: 'bg-accent-soft text-primary hover:bg-green-200',
  outline: 'border border-line bg-white text-ink hover:bg-surface',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  'danger-outline': 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}
const SIZE = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-11 px-5 text-sm gap-2' }

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconR, loading, className, children, type = 'button', as, ...rest }, ref) {
  const cls = cn('inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition disabled:pointer-events-none disabled:opacity-50', BTN[variant], SIZE[size], className)
  const inner = <>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />}{children}{IconR && <IconR className="h-4 w-4" aria-hidden />}</>
  if (as === 'link') return <Link ref={ref} className={cls} {...rest}>{inner}</Link>
  if (as === 'a') return <a ref={ref} className={cls} {...rest}>{inner}</a>
  return <button ref={ref} type={type} className={cls} disabled={loading || rest.disabled} {...rest}>{inner}</button>
})

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className, ...rest }) {
  const s = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const tone = { ghost: 'text-muted hover:bg-surface hover:text-ink', danger: 'text-red-500 hover:bg-red-50 hover:text-red-600', primary: 'text-primary hover:bg-accent-soft', outline: 'border border-line bg-white text-ink hover:bg-surface' }[variant]
  return (
    <button type="button" aria-label={label} title={label} className={cn('inline-flex shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40', s, tone, className)} {...rest}>
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}

export const Spinner = ({ className }) => <Loader2 className={cn('h-5 w-5 animate-spin text-accent', className)} />

// ---------------------------------------------------------------- Card
export function Card({ title, subtitle, actions, children, className, bodyClassName, ...rest }) {
  return (
    <section className={cn('card min-w-0', className)} {...rest}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName ?? 'p-5'}>{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------- Badges
const TONES = {
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  primary: 'bg-accent-soft text-primary ring-primary/15',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
}
export function Badge({ tone = 'gray', children, className, dot }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}
    </span>
  )
}
const STATUS_TONE = {
  Active: 'green', Inactive: 'gray', Approved: 'green', Rejected: 'red', Draft: 'gray', Scheduled: 'blue', Completed: 'green', Expired: 'gray',
  Pending: 'amber', Processing: 'blue', Shipped: 'purple', Delivered: 'green', Cancelled: 'red', Returned: 'teal',
  Paid: 'green', Failed: 'red', Refunded: 'teal', 'Partially Refunded': 'teal',
  'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'red',
  Open: 'blue', Resolved: 'green', 'Handed over': 'purple',
  Sent: 'blue', Read: 'green', Simulated: 'gray', Connected: 'green', 'Not connected': 'gray',
  Enabled: 'green', Disabled: 'gray', Queued: 'amber', 'Queued · not sent': 'amber', Manual: 'gray', 'Used up': 'gray', Processed: 'green', 'Pending gateway': 'amber',
}
export const StatusBadge = ({ status, className }) => <Badge tone={STATUS_TONE[status] || 'gray'} dot className={className}>{status}</Badge>

// ---------------------------------------------------------------- Form fields (react-hook-form friendly)
export function Field({ label, error, hint, required, children, className, htmlFor }) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && <label htmlFor={htmlFor} className="label">{label}{required && <span className="text-red-500"> *</span>}</label>}
      {children}
      {error ? <p role="alert" className="mt-1 text-xs text-red-600">{error.message || error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
export const Input = forwardRef(function Input({ className, error, ...rest }, ref) {
  return <input ref={ref} className={cn('input', error && 'input-error', className)} aria-invalid={error ? true : undefined} {...rest} />
})
export const Textarea = forwardRef(function Textarea({ className, error, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('input', error && 'input-error', className)} aria-invalid={error ? true : undefined} {...rest} />
})
/** options: array of strings or {value,label} */
export const Select = forwardRef(function Select({ options = [], placeholder, className, error, ...rest }, ref) {
  return (
    <select ref={ref} className={cn('input pr-8', error && 'input-error', className)} aria-invalid={error ? true : undefined} {...rest}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
})
/** Compact select for toolbars: <FilterSelect label="Branch" value onChange options /> */
export function FilterSelect({ label, value, onChange, options, className, allLabel }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn('input h-9 w-auto min-w-[9rem] pr-8 text-[13px]', className)}>
      {allLabel && <option value="all">{allLabel}</option>}
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Toggle({ checked, onChange, label, disabled, size = 'md', className, description }) {
  const id = useId()
  const w = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
  const k = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const tx = size === 'sm' ? 'translate-x-4' : 'translate-x-5'
  return (
    <div className={cn('relative inline-flex items-center gap-3', className)}>
      <button id={id} type="button" role="switch" aria-checked={!!checked} aria-label={typeof label === 'string' && !description ? label : undefined} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative inline-flex shrink-0 items-center rounded-full transition disabled:opacity-50', w, checked ? 'bg-accent' : 'bg-gray-300')}>
        <span className={cn('inline-block transform rounded-full bg-white shadow transition', k, checked ? tx : 'translate-x-0.5')} />
      </button>
      {(label || description) && (
        <label htmlFor={id} className="cursor-pointer select-none">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="block text-xs text-muted">{description}</span>}
        </label>
      )}
    </div>
  )
}
export const Checkbox = forwardRef(function Checkbox({ label, className, ...rest }, ref) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', className)}>
      <input ref={ref} type="checkbox" className="h-4 w-4 rounded border-line accent-[#16a34a]" {...rest} />
      {label}
    </label>
  )
})

export function SearchInput({ value, onChange, placeholder = 'Search…', className, autoFocus }) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input type="search" value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="input h-9 pl-9 pr-8 text-[13px] [&::-webkit-search-cancel-button]:hidden" />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
    </div>
  )
}

// ---------------------------------------------------------------- Page header & breadcrumbs
export function PageHeader({ title, subtitle, breadcrumbs = [], actions, className }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-1.5">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" aria-hidden />
                {b.to && i < breadcrumbs.length - 1 ? <Link to={b.to} className="hover:text-primary">{b.label}</Link> : <span aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined} className="text-ink">{b.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="truncate text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- Misc
export function EmptyState({ icon: Icon, title = 'Nothing here yet', text, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-primary"><Icon className="h-6 w-6" /></div>}
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function Avatar({ name, src, size = 36, className }) {
  const style = { width: size, height: size, fontSize: size * 0.38 }
  return src
    ? <img src={src} alt="" style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
    : <span style={style} className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-primary', className)}>{initials(name)}</span>
}
export function Thumb({ src, alt = '', size = 44, className }) {
  return (
    <span style={{ width: size, height: size }} className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface', className)}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" /> : <span className="text-[10px] text-muted">No image</span>}
    </span>
  )
}
/** Definition list rows: items=[[label, value], ...] */
export function InfoList({ items, className }) {
  return (
    <dl className={cn('divide-y divide-line text-sm', className)}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-muted">{k}</dt>
          <dd className="min-w-0 text-right font-medium break-words text-ink">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
/** Note that marks sample/simulated data honestly. */
export function DemoNote({ children, className }) {
  return <p className={cn('rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800', className)}>{children}</p>
}

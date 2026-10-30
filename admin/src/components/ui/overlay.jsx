import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '../../utils/format'
import { Button } from './basic'

// ---------------------------------------------------------------- Modal
const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    setTimeout(() => ref.current?.querySelector('input:not([type=hidden]),select,textarea,button:not([data-close])')?.focus(), 30)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        className={cn('animate-toast relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', SIZES[size], className)}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button type="button" data-close onClick={onClose} aria-label="Close dialog" className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"><X className="h-5 w-5" /></button>
        </header>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------- Toasts
const ToastCtx = createContext(null)
const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
const TONE = { success: 'text-accent', error: 'text-red-600', info: 'text-blue-600', warning: 'text-amber-600' }
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback((type, message, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setItems((xs) => [...xs.slice(-3), { id, type, message, title: opts.title }])
    setTimeout(() => dismiss(id), opts.duration || (type === 'error' ? 5000 : 3200))
  }, [dismiss])
  const api = useMemo(() => ({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
    warning: (m, o) => push('warning', m, o),
  }), [push])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {items.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id} role="status" className="animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-lg">
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', TONE[t.type])} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className="text-ink">{t.message}</p>
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
/** const toast = useToast(); toast.success('Saved') */
export const useToast = () => useContext(ToastCtx)

// ---------------------------------------------------------------- Confirm dialog
const ConfirmCtx = createContext(null)
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), [])
  const close = (v) => { state?.resolve(v); setState(null) }
  const danger = state?.tone !== 'primary'
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title || 'Are you sure?'} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => close(false)}>{state?.cancelText || 'Cancel'}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => close(true)}>{state?.confirmText || 'Confirm'}</Button>
        </>}>
        <div className="flex gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', danger ? 'bg-red-50 text-red-600' : 'bg-accent-soft text-primary')}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="pt-2 text-sm text-ink">{state?.message}</p>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  )
}
/** const confirm = useConfirm(); if (await confirm({ title, message, confirmText: 'Delete' })) … */
export const useConfirm = () => useContext(ConfirmCtx)

// ---------------------------------------------------------------- Dropdown menu
/** items: [{ label, icon, onClick, danger, divider }] ; trigger: (props) => element */
export function Dropdown({ trigger, items, align = 'right', className, width = 'w-48' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div role="menu" className={cn('animate-fade absolute z-50 mt-1 rounded-xl border border-line bg-white p-1 shadow-lg', width, align === 'right' ? 'right-0' : 'left-0')}>
          {items.filter(Boolean).map((it, i) => it.divider ? <div key={i} className="my-1 border-t border-line" /> : (
            <button key={i} role="menuitem" type="button" onClick={() => { setOpen(false); it.onClick?.() }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm', it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-surface')}>
              {it.icon && <it.icon className="h-4 w-4 shrink-0" />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

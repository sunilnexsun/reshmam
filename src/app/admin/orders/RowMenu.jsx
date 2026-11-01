// Row-level action menu rendered in a portal with fixed positioning, so it is not clipped by the
// table's horizontal-scroll container (the kit Dropdown is absolutely positioned inside it).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@admin/_lib/format'

/** items: [{ label, icon, onClick, danger, hint }] */
export default function RowMenu({ icon: Icon, label, items, disabled, heading }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const menu = useRef(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = btn.current.getBoundingClientRect()
      const h = menu.current?.offsetHeight || 160
      const w = 208
      const below = r.bottom + 4 + h <= window.innerHeight
      setPos({ top: below ? r.bottom + 4 : Math.max(8, r.top - h - 4), left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !menu.current?.contains(e.target) && !btn.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    setTimeout(() => menu.current?.querySelector('button')?.focus(), 0)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <>
      <button ref={btn} type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-35">
        <Icon className="h-4 w-4" aria-hidden />
      </button>
      {open && createPortal(
        <div ref={menu} role="menu" aria-label={label} style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
          className="animate-fade fixed z-[55] w-52 rounded-xl border border-line bg-white p-1 shadow-lg">
          {heading && <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{heading}</p>}
          {items.map((it) => (
            <button key={it.label} role="menuitem" type="button" onClick={() => { setOpen(false); it.onClick() }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm', it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-surface')}>
              {it.icon && <it.icon className="h-4 w-4 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1">{it.label}{it.hint && <span className="block text-[11px] text-muted">{it.hint}</span>}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

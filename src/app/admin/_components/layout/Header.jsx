import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@admin/_lib/navigation'
import { AlertTriangle, Bell, CheckCheck, ChevronDown, KeyRound, LogOut, Menu, MessageCircle, Package, Search, ShoppingCart, User, Users } from 'lucide-react'
import { cn, timeAgo } from '@admin/_lib/format'
import { useAuth } from '@admin/_lib/auth'
import { markNotificationsRead, useDb } from '@admin/_lib/store'
import { notifications as deriveNotifications } from '@admin/_lib/selectors'
import { Avatar, Badge, Dropdown } from '@admin/_components/ui'

function GlobalSearch() {
  
  const db = useDb()
  const { can } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const r = []
    // Only search what the user's role may open (customer names and phone numbers are personal data).
    if (can('products')) db.products.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(s)).slice(0, 4).forEach((p) => r.push({ icon: Package, label: p.name, sub: `${p.category} · ${p.sku}`, to: `/products/${p.id}` }))
    if (can('orders')) db.orders.filter((o) => `${o.number} ${o.customerName}`.toLowerCase().includes(s)).slice(0, 4).forEach((o) => r.push({ icon: ShoppingCart, label: o.number, sub: `${o.customerName} · ${o.status}`, to: `/orders/${o.id}` }))
    if (can('customers')) db.customers.filter((c) => `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(s)).slice(0, 4).forEach((c) => r.push({ icon: Users, label: c.name, sub: c.phone, to: `/customers/${c.id}` }))
    return r
  }, [q, db, can])
  useEffect(() => {
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); ref.current?.querySelector('input')?.focus() } }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [])
  const go = (r) => { navigate(r.to); setQ(''); setOpen(false) }
  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input type="search" value={q} placeholder="Search products, orders, customers…" aria-label="Global search"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && results[active]) go(results[active])
          if (e.key === 'Escape') setOpen(false)
        }}
        className="input h-10 rounded-full border-transparent bg-surface pl-9 pr-14 [&::-webkit-search-cancel-button]:hidden" />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[10px] text-muted md:block">Ctrl K</kbd>
      {open && q.trim().length >= 2 && (
        <div className="animate-fade absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-xl">
          {results.length === 0 ? <p className="px-3 py-4 text-center text-sm text-muted">No matches for “{q}”</p> : results.map((r, i) => (
            <button key={r.to} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r)}
              className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === active ? 'bg-surface' : '')}>
              <r.icon className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.label}</span><span className="block truncate text-xs text-muted">{r.sub}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Notifications() {
  const db = useDb()
  const { can } = useAuth()
  const list = useMemo(() => deriveNotifications(db, can), [db, can])
  const unread = list.filter((n) => !n.read)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const icon = { danger: AlertTriangle, warning: AlertTriangle, info: ShoppingCart }
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`Notifications, ${unread.length} unread`} aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface">
        <Bell className="h-5 w-5" />
        {unread.length > 0 && <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread.length > 9 ? '9+' : unread.length}</span>}
      </button>
      {open && (
        <div className="animate-fade fixed inset-x-3 top-16 z-50 rounded-xl border border-line bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread.length > 0 && <button type="button" onClick={() => markNotificationsRead(unread.map((n) => n.id))} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
          </div>
          <ul className="scroll-thin max-h-96 divide-y divide-line overflow-y-auto">
            {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</li>}
            {list.map((n) => {
              const I = n.title === 'Chat handover' ? MessageCircle : icon[n.type]
              return (
                <li key={n.id}>
                  <Link to={n.to} onClick={() => { markNotificationsRead([n.id]); setOpen(false) }} className={cn('flex gap-3 px-4 py-3 hover:bg-surface', !n.read && 'bg-accent-soft/30')}>
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.type === 'danger' ? 'bg-red-50 text-red-600' : n.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}><I className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{n.title}</span>{n.at && <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.at)}</span>}</span>
                      <span className="block truncate text-xs text-muted">{n.text}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Header({ onOpenMobile }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileSearch, setMobileSearch] = useState(false)
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
    <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
      <button type="button" onClick={onOpenMobile} aria-label="Open menu" className="-ml-1 rounded-lg p-2 text-ink hover:bg-surface lg:hidden"><Menu className="h-5 w-5" /></button>
      <div className="hidden min-w-0 flex-1 sm:block"><GlobalSearch /></div>
      <div className="flex-1 sm:hidden" />
      <button type="button" onClick={() => setMobileSearch((v) => !v)} aria-label="Search" aria-expanded={mobileSearch} className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface sm:hidden"><Search className="h-5 w-5" /></button>
      <Badge tone="green" className="hidden md:inline-flex" title="Connected to Firebase Cloud Firestore"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live DB</Badge>
      <Notifications />
      <Dropdown width="w-56" trigger={(p) => (
        <button type="button" {...p} aria-label="Account menu" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface">
          <Avatar name={user?.name} src={user?.avatar} size={34} />
          <span className="hidden text-left leading-tight md:block"><span className="block text-sm font-semibold">{user?.name}</span><span className="block text-[11px] text-muted">{user?.role}</span></span>
          <ChevronDown className="hidden h-4 w-4 text-muted md:block" />
        </button>
      )} items={[
        { label: 'My Profile', icon: User, onClick: () => navigate('/settings?tab=profile') },
        { label: 'Change Password', icon: KeyRound, onClick: () => navigate('/settings?tab=password') },
        { divider: true },
        { label: 'Logout', icon: LogOut, danger: true, onClick: logout },
      ]} />
    </div>
    {mobileSearch && <div className="px-4 pb-3 sm:hidden"><GlobalSearch /></div>}
    </header>
  )
}

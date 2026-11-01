'use client'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from '@admin/_lib/navigation'
import { ShieldAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@admin/_lib/format'
import { useAuth } from '@admin/_lib/auth'
import { useSaveFailed } from '@admin/_lib/store'
import { EmptyState } from '@admin/_components/ui'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NAV } from './navigation'

const COLLAPSE_KEY = 'reshmam-admin-sidebar'

export function AdminLayout({ children }) {
  const { user, can } = useAuth()
  const saveFailed = useSaveFailed()
  const { pathname, search } = useLocation()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false } })
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ } }, [collapsed])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />
  const nav = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const personalSettings = pathname === '/settings' && /[?&]tab=(profile|password)\b/.test(search)
  const allowed = !nav || can(nav.module) || personalSettings

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={cn('flex min-h-screen min-w-0 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <Header onOpenMobile={() => setMobileOpen(true)} />
        {saveFailed && (
          <div role="alert" className="no-print flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-6 lg:px-8">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p><b>Changes are not being saved.</b> This browser&apos;s storage for the admin panel is full, so anything you change now will be lost when the page reloads. Remove large images (product photos, banners, logo) or reset the demo data in Settings, then make your change again.</p>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1500px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {allowed ? children : <EmptyState icon={ShieldAlert} title="You don't have access to this page" text="Ask an administrator to update your role permissions in Settings → Roles & Permissions." />}
        </main>
        <footer className="no-print border-t border-line px-6 py-4 text-center text-xs text-muted">© {new Date().getFullYear()} RESHMAM · Admin Panel · Designed & Developed by Nexsun Tech Solutionz</footer>
      </div>
    </div>
  )
}

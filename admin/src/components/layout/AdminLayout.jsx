import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { cn } from '../../utils/format'
import { useAuth } from '../../services/auth'
import { EmptyState } from '../ui'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NAV } from './navigation'

const COLLAPSE_KEY = 'reshmam-admin-sidebar'

export function AdminLayout() {
  const { user, can } = useAuth()
  const { pathname, search } = useLocation()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false } })
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ } }, [collapsed])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />
  const nav = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const personalSettings = pathname === '/settings' && /[?&]tab=(profile|password)\b/.test(search)
  const allowed = !nav || can(nav.module) || personalSettings

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={cn('flex min-h-screen min-w-0 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {allowed ? <Outlet /> : <EmptyState icon={ShieldAlert} title="You don't have access to this page" text="Ask an administrator to update your role permissions in Settings → Roles & Permissions." />}
        </main>
        <footer className="no-print border-t border-line px-6 py-4 text-center text-xs text-muted">© {new Date().getFullYear()} RESHMAM · Admin Panel · Designed & Developed by Nexsun Tech Solutionz</footer>
      </div>
    </div>
  )
}

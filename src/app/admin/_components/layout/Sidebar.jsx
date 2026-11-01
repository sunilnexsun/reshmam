import { NavLink } from '@admin/_lib/navigation'
import { ChevronsLeft, ChevronsRight, LogOut, X } from 'lucide-react'
import { cn } from '@admin/_lib/format'
import { useAuth } from '@admin/_lib/auth'
import logoWhite from '@admin/_assets/logo-white.png'
import { NAV } from './navigation'

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { can, logout } = useAuth()
  const items = NAV.filter((n) => can(n.module))
  return (
    <>
      {mobileOpen && <div className="animate-fade fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} aria-hidden />}
      <aside
        aria-label="Main navigation"
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 flex flex-col bg-primary text-white transition-[width,transform] duration-200',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          'w-72 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10', collapsed ? 'lg:justify-center lg:px-0' : '', 'px-5')}>
          <img src={logoWhite.src} alt="" className="h-9 w-auto" />
          <div className={cn('leading-none', collapsed && 'lg:hidden')}>
            <p className="font-serif text-xl font-bold tracking-wide">RESHMAM</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70">Admin Panel</p>
          </div>
          <button type="button" onClick={onCloseMobile} aria-label="Close menu" className="ml-auto rounded-lg p-1.5 text-white/80 hover:bg-white/10 lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} onClick={onCloseMobile} title={collapsed ? label : undefined}
                  className={({ isActive }) => cn(
                    'group flex h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition',
                    collapsed && 'lg:justify-center lg:px-0',
                    isActive ? 'bg-white text-primary shadow-sm' : 'text-white/85 hover:bg-white/10 hover:text-white',
                  )}>
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  <span className={cn('truncate', collapsed && 'lg:sr-only')}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <button type="button" onClick={logout} title={collapsed ? 'Logout' : undefined}
            className={cn('flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium text-white/85 hover:bg-white/10', collapsed && 'lg:justify-center lg:px-0')}>
            <LogOut className="h-[18px] w-[18px]" aria-hidden /><span className={cn(collapsed && 'lg:sr-only')}>Logout</span>
          </button>
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('hidden h-9 w-full items-center gap-3 rounded-lg px-3 text-xs text-white/60 hover:bg-white/10 hover:text-white lg:flex', collapsed && 'justify-center px-0')}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse</>}
          </button>
        </div>
      </aside>
    </>
  )
}

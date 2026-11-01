'use client'
import { useSearchParams } from '@admin/_lib/navigation'
import { AlertTriangle, Bell, Bot, Building, CreditCard, Image, KeyRound, MessageCircle, Receipt, Settings2, ShieldCheck, Truck, UserCircle, Users } from 'lucide-react'
import { PageHeader } from '@admin/_components/ui'
import { useAuth } from '@admin/_lib/auth'
import { cn } from '@admin/_lib/format'
import { ProfileSettings, PasswordSettings } from './sections/AccountSections'
import { PaymentSettings, ShippingSettings, TaxSettings } from './sections/CommerceSections'
import { AiSettings, DangerZone, WhatsAppApiSettings } from './sections/IntegrationSections'
import { CompanySettings, GeneralSettings, LogoSettings, NotificationSettings } from './sections/StoreSections'
import { RolesSettings, UsersSettings } from './sections/TeamSections'

const GROUPS = [
  { label: 'Store', items: [
    { id: 'general', label: 'General', icon: Settings2, C: GeneralSettings },
    { id: 'company', label: 'Company Info', icon: Building, C: CompanySettings },
    { id: 'logo', label: 'Logo', icon: Image, C: LogoSettings },
  ] },
  { label: 'My account', items: [
    { id: 'profile', label: 'Admin Profile', icon: UserCircle, C: ProfileSettings, personal: true },
    { id: 'password', label: 'Change Password', icon: KeyRound, C: PasswordSettings, personal: true },
  ] },
  { label: 'Team', items: [
    { id: 'users', label: 'User Management', icon: Users, C: UsersSettings },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, C: RolesSettings },
  ] },
  { label: 'Business', items: [
    { id: 'notifications', label: 'Notifications', icon: Bell, C: NotificationSettings },
    { id: 'tax', label: 'Tax & GST', icon: Receipt, C: TaxSettings },
    { id: 'payment', label: 'Payment', icon: CreditCard, C: PaymentSettings },
    { id: 'shipping', label: 'Shipping', icon: Truck, C: ShippingSettings },
  ] },
  { label: 'Integrations', items: [
    { id: 'whatsapp', label: 'WhatsApp API', icon: MessageCircle, C: WhatsAppApiSettings },
    { id: 'ai', label: 'AI Configuration', icon: Bot, C: AiSettings },
  ] },
  { label: 'Advanced', items: [{ id: 'danger', label: 'Danger Zone', icon: AlertTriangle, C: DangerZone, danger: true, manageOnly: true }] },
]

export default function Settings() {
  const { can } = useAuth()
  const canManage = can('settings', 'manage')
  const canView = can('settings')
  const [params, setParams] = useSearchParams()
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => (canView || i.personal) && (!i.manageOnly || canManage)) })).filter((g) => g.items.length)
  const all = groups.flatMap((g) => g.items)
  const current = all.find((i) => i.id === params.get('tab')) || all[0]
  const Section = current.C
  const select = (id) => setParams({ tab: id }, { replace: true })

  return (
    <>
      <PageHeader title="Settings" subtitle={canManage ? 'Store configuration, team access and integrations.' : canView ? 'You can view store settings. Your own profile and password can always be changed.' : 'Manage your own profile and password.'}
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: current.label }]} />
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ul className="scroll-thin -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:card lg:flex-col lg:gap-0 lg:overflow-visible lg:p-2">
            {groups.map((g) => (
              <li key={g.label} className="contents lg:block">
                <p className="hidden px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted first:pt-1 lg:block">{g.label}</p>
                <ul className="contents lg:block">
                  {g.items.map((i) => (
                    <li key={i.id} className="shrink-0">
                      <button type="button" onClick={() => select(i.id)} aria-current={current.id === i.id ? 'page' : undefined}
                        className={cn('flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition lg:border-0',
                          current.id === i.id ? (i.danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-accent/30 bg-accent-soft text-primary') : cn('border-line bg-white lg:bg-transparent', i.danger ? 'text-red-600 hover:bg-red-50' : 'text-muted hover:text-ink lg:hover:bg-surface'))}>
                        <i.icon className="h-4 w-4 shrink-0" aria-hidden />{i.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Section key={current.id} canEdit={current.personal || canManage} />
        </div>
      </div>
    </>
  )
}

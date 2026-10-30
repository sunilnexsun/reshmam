import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Image as ImageIcon, Megaphone, Ticket, TicketPercent } from 'lucide-react'
import { PageHeader, StatCard, Tabs } from '../../components/ui'
import { useDb } from '../../services/store'
import { useAuth } from '../../services/auth'
import { inr, num } from '../../utils/format'
import BannersTab from './BannersTab'
import CampaignsTab from './CampaignsTab'
import CouponsTab from './CouponsTab'
import { couponState, todayISO } from './marketingUtils'

const TABS = [
  { value: 'coupons', label: 'Coupons', icon: Ticket, Comp: CouponsTab },
  { value: 'campaigns', label: 'Campaigns', icon: Megaphone, Comp: CampaignsTab },
  { value: 'banners', label: 'Banners', icon: ImageIcon, Comp: BannersTab },
]

export default function Marketing() {
  const db = useDb()
  const { can } = useAuth()
  const canManage = can('marketing', 'manage')
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.value === params.get('tab')) || TABS[0]

  const s = useMemo(() => {
    const today = todayISO()
    const couponOrders = db.orders.filter((o) => o.couponCode)
    return {
      activeCoupons: db.coupons.filter((c) => couponState(c, today) === 'Active').length,
      redemptions: db.coupons.reduce((sum, c) => sum + (c.used || 0), 0),
      discount: couponOrders.reduce((sum, o) => sum + (o.discount || 0), 0),
      upcoming: db.campaigns.filter((c) => c.status === 'Scheduled' || c.status === 'Queued').length,
      drafts: db.campaigns.filter((c) => c.status === 'Draft').length,
      liveBanners: db.banners.filter((b) => b.status === 'Active').length,
    }
  }, [db])

  const { Comp } = tab
  return (
    <>
      <PageHeader title="Marketing" subtitle="Coupons, customer campaigns and storefront banners." breadcrumbs={[{ label: 'Marketing' }]} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Coupons" value={num(s.activeCoupons)} icon={Ticket} hint={`${num(db.coupons.length)} coupons in total`} onClick={() => setParams({}, { replace: true })} />
        <StatCard label="Coupon Redemptions" value={num(s.redemptions)} icon={TicketPercent} tone="blue" hint={`${inr(s.discount)} discount given on orders`} />
        <StatCard label="Upcoming Campaigns" value={num(s.upcoming)} icon={Megaphone} tone="purple" hint={`Scheduled or queued · ${num(s.drafts)} draft${s.drafts === 1 ? '' : 's'} · ${num(db.campaigns.length)} total`} onClick={() => setParams({ tab: 'campaigns' }, { replace: true })} />
        <StatCard label="Live Banners" value={num(s.liveBanners)} icon={ImageIcon} tone="amber" hint={`${num(db.banners.length - s.liveBanners)} hidden`} onClick={() => setParams({ tab: 'banners' }, { replace: true })} />
      </div>
      <Tabs className="mb-6" value={tab.value} onChange={(v) => setParams(v === 'coupons' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((t) => ({ value: t.value, label: t.label, icon: t.icon, count: t.value === 'coupons' ? db.coupons.length : t.value === 'campaigns' ? db.campaigns.length : db.banners.length }))} />
      <div role="tabpanel" aria-label={tab.label}><Comp canManage={canManage} /></div>
    </>
  )
}

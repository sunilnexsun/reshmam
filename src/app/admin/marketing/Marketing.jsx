'use client'
import { useMemo } from 'react'
import { CheckCircle2, IndianRupee, Ticket, TicketPercent } from 'lucide-react'
import { PageHeader, StatCard } from '@admin/_components/ui'
import { useDb } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { inr, num } from '@admin/_lib/format'
import CouponsTab from './CouponsTab'
import { couponState, todayISO } from './marketingUtils'

export default function Marketing() {
  const db = useDb()
  const { can } = useAuth()
  const canManage = can('marketing', 'manage')

  const s = useMemo(() => {
    const today = todayISO()
    const coupons = db.coupons || []
    const orders = db.orders || []
    const couponOrders = orders.filter((o) => o.couponCode)
    const activeCoupons = coupons.filter((c) => couponState(c, today) === 'Active').length
    const scheduledOrExpired = coupons.length - activeCoupons
    return {
      totalCoupons: coupons.length,
      activeCoupons,
      scheduledOrExpired,
      redemptions: coupons.reduce((sum, c) => sum + (c.used || 0), 0),
      discount: couponOrders.reduce((sum, o) => sum + (o.discount || 0), 0),
      couponOrderCount: couponOrders.length,
    }
  }, [db.coupons, db.orders])

  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle="Create and manage discount coupon codes synced live with Firestore."
        breadcrumbs={[{ label: 'Coupons' }]}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Coupons"
          value={num(s.totalCoupons)}
          icon={Ticket}
          hint={`${num(s.scheduledOrExpired)} inactive / expired`}
        />
        <StatCard
          label="Active Coupons"
          value={num(s.activeCoupons)}
          icon={CheckCircle2}
          tone="blue"
          hint="Available for customers at checkout"
        />
        <StatCard
          label="Total Redemptions"
          value={num(s.redemptions)}
          icon={TicketPercent}
          tone="purple"
          hint={`Across ${num(s.totalCoupons)} coupon${s.totalCoupons === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Discount Given"
          value={inr(s.discount)}
          icon={IndianRupee}
          tone="amber"
          hint={`Across ${num(s.couponOrderCount)} order${s.couponOrderCount === 1 ? '' : 's'}`}
        />
      </div>
      <CouponsTab canManage={canManage} />
    </>
  )
}

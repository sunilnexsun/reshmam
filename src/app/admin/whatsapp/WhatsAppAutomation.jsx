'use client'
import { useMemo } from 'react'
import { useSearchParams } from '@admin/_lib/navigation'
import { CheckCheck, FileText, ListChecks, MessageCircle, ScrollText, XCircle, Zap } from 'lucide-react'
import { Card, PageHeader, StatCard, StatusBadge, Tabs } from '@admin/_components/ui'
import { useDb } from '@admin/_lib/store'
import { useAuth } from '@admin/_lib/auth'
import { num } from '@admin/_lib/format'
import AutomationsTab from './AutomationsTab'
import ConnectionPanel from './ConnectionPanel'
import LogsTab from './LogsTab'
import TemplatesTab from './TemplatesTab'

const TAB_IDS = ['templates', 'automations', 'logs']

export default function WhatsAppAutomation() {
  const db = useDb()
  const { can } = useAuth()
  const canManage = can('whatsapp', 'manage')
  const [params, setParams] = useSearchParams()
  const tab = TAB_IDS.includes(params.get('tab')) ? params.get('tab') : 'templates'
  const wa = db.whatsapp

  const stats = useMemo(() => {
    const real = wa.logs.filter((l) => l.status !== 'Simulated')
    const delivered = real.filter((l) => ['Delivered', 'Read'].includes(l.status)).length
    return {
      total: wa.logs.length,
      deliveredRate: real.length ? Math.round((delivered / real.length) * 100) : 0,
      failed: wa.logs.filter((l) => l.status === 'Failed').length,
      simulated: wa.logs.length - real.length,
      active: wa.automations.filter((a) => a.enabled).length,
    }
  }, [wa.logs, wa.automations])

  return (
    <>
      <PageHeader title="WhatsApp Automation" subtitle="Automated order updates and customer messages via the WhatsApp Business Cloud API."
        breadcrumbs={[{ label: 'WhatsApp Automation' }]} actions={<StatusBadge status={wa.config.status || 'Not connected'} />} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Messages Logged" value={num(stats.total)} icon={MessageCircle} hint={stats.simulated ? `${stats.simulated} simulated tests · sample data` : 'Sample data'} onClick={() => setParams({ tab: 'logs' }, { replace: true })} />
        <StatCard label="Delivered / Read Rate" value={`${stats.deliveredRate}%`} icon={CheckCheck} tone="blue" hint="Of sample delivery records" />
        <StatCard label="Failed Messages" value={num(stats.failed)} icon={XCircle} tone="red" hint="Check error details in logs" />
        <StatCard label="Active Automations" value={`${stats.active} / ${wa.automations.length}`} icon={Zap} tone="amber" hint={wa.config.enabled ? 'Automation switched on' : 'Master switch is off'} onClick={() => setParams({ tab: 'automations' }, { replace: true })} />
      </div>

      <ConnectionPanel config={wa.config} canManage={canManage} />

      <Card className="mt-6" bodyClassName="p-0">
        <Tabs className="px-2" value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} tabs={[
          { value: 'templates', label: 'Templates', icon: FileText, count: wa.templates.length },
          { value: 'automations', label: 'Automated Messages', icon: ListChecks, count: stats.active },
          { value: 'logs', label: 'Message Logs', icon: ScrollText, count: wa.logs.length },
        ]} />
        {tab === 'templates' && <TemplatesTab canManage={canManage} />}
        {tab === 'automations' && <AutomationsTab canManage={canManage} masterEnabled={wa.config.enabled} />}
        {tab === 'logs' && <LogsTab canManage={canManage} />}
      </Card>
    </>
  )
}

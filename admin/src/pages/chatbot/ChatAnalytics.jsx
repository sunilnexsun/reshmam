import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Clock, Headset, MessagesSquare, Percent } from 'lucide-react'
import { Card, DemoNote, StatCard } from '../../components/ui'
import { AXIS, CHART_COLORS, ChartTooltip, GRID } from '../../components/charts'
import { useDb } from '../../services/store'
import { num } from '../../utils/format'
import { CONV_STATUSES } from './constants'

const DAYS = 14

export default function ChatAnalytics() {
  const db = useDb()
  const convs = db.chatbot.conversations
  const data = useMemo(() => {
    const count = (s) => convs.filter((c) => c.status === s).length
    const byStatus = CONV_STATUSES.map((s) => ({ name: s, value: count(s) }))
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const byDay = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (DAYS - 1 - i))
      const key = d.toDateString()
      return { label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: convs.filter((c) => new Date(c.startedAt).toDateString() === key).length }
    })
    const resolved = count('Resolved')
    return { byStatus, byDay, total: convs.length, resolved, pending: count('Open') + count('Pending'), handed: count('Handed over'), rate: convs.length ? Math.round((resolved / convs.length) * 100) : 0 }
  }, [convs])

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Conversations" value={num(data.total)} icon={MessagesSquare} />
        <StatCard label="Resolved" value={num(data.resolved)} icon={CheckCircle2} tone="teal" />
        <StatCard label="Open / Pending" value={num(data.pending)} icon={Clock} tone="amber" />
        <StatCard label="Handed Over" value={num(data.handed)} icon={Headset} tone="purple" />
        <StatCard label="Resolution Rate" value={`${data.rate}%`} icon={Percent} tone="blue" hint="Resolved ÷ total" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Conversations by status">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} interval={0} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(6,78,59,0.06)' }} content={<ChartTooltip />} />
              <Bar dataKey="value" name="Conversations" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title={`Conversations per day`} subtitle={`Last ${DAYS} days, by start date`}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} minTickGap={12} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(6,78,59,0.06)' }} content={<ChartTooltip />} />
              <Bar dataKey="value" name="Conversations" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <DemoNote>Figures are calculated from the conversations stored in this panel, which are sample data until the chat backend is connected.</DemoNote>
    </div>
  )
}

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, BookOpen, GitBranch, MessagesSquare, MessageSquareDashed, Settings2 } from 'lucide-react'
import { Button, Card, PageHeader, Tabs, Toggle, useToast } from '../../components/ui'
import { logActivity, updateSection, useDb } from '../../services/store'
import { useAuth } from '../../services/auth'
import BotSettings from './BotSettings'
import ChatAnalytics from './ChatAnalytics'
import ChatSimulator from './ChatSimulator'
import Conversations from './Conversations'
import FlowBuilder from './FlowBuilder'
import KnowledgeBase from './KnowledgeBase'

const TAB_IDS = ['flows', 'knowledge', 'conversations', 'analytics', 'settings']

export default function AIChatbot() {
  const db = useDb()
  const toast = useToast()
  const { can } = useAuth()
  const canManage = can('chatbot', 'manage')
  const [params, setParams] = useSearchParams()
  const tab = TAB_IDS.includes(params.get('tab')) ? params.get('tab') : 'flows'
  const [testOpen, setTestOpen] = useState(false)
  const cb = db.chatbot
  const open = cb.conversations.filter((c) => c.status !== 'Resolved').length

  const onEnable = (enabled) => {
    updateSection('chatbot.settings', { enabled })
    logActivity('chatbot', `Chatbot ${enabled ? 'enabled' : 'disabled'}`)
    toast.success(`Chatbot ${enabled ? 'enabled' : 'disabled'}`)
  }

  return (
    <>
      <PageHeader title="AI Chatbot" subtitle="Customer support assistant for the website and WhatsApp." breadcrumbs={[{ label: 'AI Chatbot' }]}
        actions={<>
          <div className="flex h-10 items-center rounded-lg border border-line bg-white px-3">
            <Toggle checked={cb.settings.enabled} onChange={onEnable} disabled={!canManage} size="sm" label={`Chatbot ${cb.settings.enabled ? 'on' : 'off'}`} />
          </div>
          <Button icon={MessageSquareDashed} onClick={() => setTestOpen(true)}>Test chatbot</Button>
        </>} />

      <Card bodyClassName="p-0">
        <Tabs className="px-2" value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} tabs={[
          { value: 'flows', label: 'Chat Flow', icon: GitBranch, count: cb.flows.length },
          { value: 'knowledge', label: 'Knowledge Base', icon: BookOpen, count: cb.knowledge.length },
          { value: 'conversations', label: 'Conversations', icon: MessagesSquare, count: open },
          { value: 'analytics', label: 'Analytics', icon: BarChart3 },
          { value: 'settings', label: 'Settings', icon: Settings2 },
        ]} />
        {tab === 'flows' && <FlowBuilder canManage={canManage} />}
        {tab === 'knowledge' && <KnowledgeBase canManage={canManage} />}
        {tab === 'conversations' && <Conversations canManage={canManage} />}
        {tab === 'analytics' && <ChatAnalytics />}
        {tab === 'settings' && <BotSettings settings={cb.settings} canManage={canManage} />}
      </Card>

      <ChatSimulator open={testOpen} onClose={() => setTestOpen(false)} />
    </>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bot, CheckCircle2, Globe, Headset, MessageCircle, MessagesSquare, Phone, RotateCcw, Send, UserRound } from 'lucide-react'
import { Avatar, Badge, Button, EmptyState, FilterSelect, SearchInput, StatusBadge, useToast } from '../../components/ui'
import { logActivity, updateItem, useDb } from '../../services/store'
import { useAuth } from '../../services/auth'
import { cn, dateTime, timeAgo } from '../../utils/format'
import { CONV_STATUSES } from './constants'


function Bubble({ m }) {
  const mine = m.from !== 'user'
  const Icon = m.from === 'user' ? UserRound : m.from === 'agent' ? Headset : Bot
  return (
    <div className={cn('flex gap-2', mine && 'flex-row-reverse')}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', m.from === 'user' ? 'bg-gray-200 text-gray-700' : m.from === 'agent' ? 'bg-violet-100 text-violet-700' : 'bg-primary text-white')}><Icon className="h-4 w-4" aria-hidden /></span>
      <div className={cn('min-w-0 max-w-[80%]', mine && 'text-right')}>
        <p className={cn('inline-block rounded-2xl px-3 py-2 text-left text-[13px] whitespace-pre-wrap break-words',
          m.from === 'user' ? 'rounded-tl-sm bg-white text-ink shadow-sm' : m.from === 'agent' ? 'rounded-tr-sm bg-violet-600 text-white' : 'rounded-tr-sm bg-[#DCF8C6] text-ink')}>{m.text}</p>
        <p className="mt-0.5 text-[10px] text-muted">
          {m.from === 'user' ? 'Customer' : m.from === 'agent' ? `Agent${m.by ? ` · ${m.by}` : ''}` : 'AI assistant'} · {dateTime(m.at)}
          {m.from === 'agent' && m.local && <span className="text-amber-700"> · saved locally, not delivered</span>}
        </p>
      </div>
    </div>
  )
}

export default function Conversations({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [reply, setReply] = useState('')
  const status = params.get('status') || 'all'
  const selectedId = params.get('c')
  const endRef = useRef(null)
  const setParam = (k, v) => setParams((p) => { p.set('tab', 'conversations'); if (v && v !== 'all') p.set(k, v); else p.delete(k); return p }, { replace: true })

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...db.chatbot.conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .filter((c) => (status === 'all' || c.status === status) && (!s || `${c.customer} ${c.phone} ${c.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(s)))
  }, [db.chatbot.conversations, q, status])
  const conv = db.chatbot.conversations.find((c) => c.id === selectedId)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv?.messages.length, selectedId])

  const setStatus = (next) => {
    updateItem('chatbot.conversations', conv.id, { status: next })
    logActivity('chatbot', `Conversation with ${conv.customer} marked ${next}`)
    toast.success(`Conversation marked ${next}`)
  }
  const onReply = (e) => {
    e.preventDefault()
    const text = reply.trim()
    if (!text) return
    const at = new Date().toISOString()
    updateItem('chatbot.conversations', conv.id, (c) => ({ messages: [...c.messages, { from: 'agent', text, at, by: user?.name, local: true }], updatedAt: at, status: c.status === 'Resolved' ? 'Open' : c.status }))
    setReply('')
    toast.info('Reply saved to the conversation. It was not delivered — sending needs the WhatsApp / website chat backend.', { duration: 6000 })
  }

  return (
    <div className="grid min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className={cn('min-w-0 border-line lg:border-r', conv && 'hidden lg:block')}>
        <div className="space-y-2 border-b border-line p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, phone or message" />
          <FilterSelect label="Conversation status" value={status} onChange={(v) => setParam('status', v)} allLabel="All conversations" options={CONV_STATUSES} className="w-full" />
        </div>
        {list.length === 0 ? <EmptyState icon={MessagesSquare} title="No conversations" text="Try a different filter." /> : (
          <ul className="scroll-thin max-h-[640px] divide-y divide-line overflow-y-auto">
            {list.map((c) => {
              const last = c.messages[c.messages.length - 1]
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => setParam('c', c.id)} aria-current={c.id === selectedId ? 'true' : undefined}
                    className={cn('flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-surface', c.id === selectedId && 'bg-accent-soft/50')}>
                    <Avatar name={c.customer} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="truncate text-[13px] font-semibold">{c.customer}</p><span className="shrink-0 text-[10px] text-muted">{timeAgo(c.updatedAt)}</span></div>
                      <p className="truncate text-xs text-muted">{last?.from === 'user' ? '' : last?.from === 'agent' ? 'You: ' : 'Bot: '}{last?.text}</p>
                      <div className="mt-1 flex items-center gap-1.5"><StatusBadge status={c.status} /><span className="inline-flex items-center gap-1 text-[10px] text-muted">{c.channel === 'WhatsApp' ? <MessageCircle className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{c.channel}</span></div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className={cn('flex min-w-0 flex-col', !conv && 'hidden lg:flex')}>
        {!conv ? <EmptyState icon={MessagesSquare} title="Select a conversation" text="Choose a conversation on the left to read the history and reply." className="flex-1" /> : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
              <button type="button" onClick={() => setParam('c', '')} className="rounded-lg p-1.5 text-muted hover:bg-surface lg:hidden" aria-label="Back to conversation list"><ArrowLeft className="h-5 w-5" /></button>
              <Avatar name={conv.customer} size={40} className="hidden sm:inline-flex" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{conv.customer}</p>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted"><span className="inline-flex items-center gap-1 whitespace-nowrap"><Phone className="h-3 w-3" />{conv.phone}</span><span>{conv.channel}</span><span className="whitespace-nowrap">Started {dateTime(conv.startedAt)}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={conv.status} />
                {conv.sample && <Badge>Sample</Badge>}
              </div>
              {canManage && (
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {conv.status !== 'Resolved' && <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setStatus('Resolved')}>Resolve</Button>}
                  {conv.status !== 'Handed over' && conv.status !== 'Resolved' && <Button size="sm" variant="outline" icon={Headset} onClick={() => setStatus('Handed over')}>Hand over</Button>}
                  {conv.status === 'Resolved' && <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => setStatus('Open')}>Reopen</Button>}
                </div>
              )}
            </div>
            <div className="scroll-thin max-h-[520px] min-h-[320px] flex-1 space-y-3 overflow-y-auto bg-surface p-4">
              {conv.messages.map((m, i) => <Bubble key={i} m={m} />)}
              <div ref={endRef} />
            </div>
            {canManage && (
              <form onSubmit={onReply} className="border-t border-line p-3">
                <div className="flex gap-2">
                  <label htmlFor="conv-reply" className="sr-only">Reply as agent</label>
                  <input id="conv-reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply as agent…" className="input h-10 min-w-0 flex-1" />
                  <Button type="submit" icon={Send} disabled={!reply.trim()}>Reply</Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">Replies are saved in the admin panel only (not delivered to the customer) until the messaging backend is connected.</p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

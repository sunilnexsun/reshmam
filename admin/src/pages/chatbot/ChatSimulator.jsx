import { useEffect, useRef, useState } from 'react'
import { Bot, RotateCcw, Send, UserRound } from 'lucide-react'
import { Badge, Button, DemoNote, IconButton, Modal } from '../../components/ui'
import { useDb } from '../../services/store'
import { cn } from '../../utils/format'
import { reply } from './botEngine'

/** Test-chat panel: rule-based replies from flows + knowledge base (no AI provider call). */
export default function ChatSimulator({ open, onClose }) {
  const db = useDb()
  const s = db.chatbot.settings
  const [msgs, setMsgs] = useState([])
  const [ctx, setCtx] = useState({})
  const [text, setText] = useState('')
  const endRef = useRef(null)

  const start = () => {
    const welcome = db.chatbot.flows.find((f) => f.id === 'f_welcome' && f.enabled)
    setMsgs([{ from: 'bot', text: s.welcome, buttons: welcome?.buttons || [], source: 'welcome message' }])
    setCtx({ flowId: welcome?.id })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) start() }, [open])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  const send = (value) => {
    const v = value.trim()
    if (!v) return
    const r = reply(db, v, ctx)
    setMsgs((m) => [...m, { from: 'user', text: v }, { from: 'bot', ...r }])
    setCtx({ flowId: r.flowId || ctx.flowId })
    setText('')
  }

  return (
    <Modal open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2">Test chatbot <Badge tone="amber">Simulator</Badge></span>}
      subtitle={`${s.botName} · rule-based replies from your flows and knowledge base`} size="md">
      {!s.enabled && <DemoNote className="mb-3">The chatbot is currently disabled for customers. You can still test it here.</DemoNote>}
      <div className="flex h-[min(60vh,480px)] flex-col overflow-hidden rounded-xl border border-line">
        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-surface p-3" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.from === 'user' && 'flex-row-reverse')}>
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', m.from === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-primary text-white')}>{m.from === 'user' ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span>
              <div className={cn('min-w-0 max-w-[80%]', m.from === 'user' && 'text-right')}>
                <p className={cn('inline-block rounded-2xl px-3 py-2 text-left text-[13px] whitespace-pre-wrap break-words', m.from === 'user' ? 'rounded-tr-sm bg-blue-600 text-white' : 'rounded-tl-sm bg-white text-ink shadow-sm')}>{m.text.replace(/\*([^*]+)\*/g, '$1')}</p>
                {m.from === 'bot' && m.source && <p className="mt-0.5 text-[10px] text-muted">{m.handover ? 'Hand over to human · ' : ''}{m.source}</p>}
                {m.from === 'bot' && i === msgs.length - 1 && m.buttons?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.buttons.map((b) => <button key={b} type="button" onClick={() => send(b)} className="rounded-full border border-accent/40 bg-white px-3 py-1 text-xs font-medium text-primary hover:bg-accent-soft">{b}</button>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex gap-2 border-t border-line bg-white p-2">
          <IconButton icon={RotateCcw} label="Restart conversation" onClick={start} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a customer message…" aria-label="Test message" className="input h-9 min-w-0 flex-1 text-[13px]" />
          <Button type="submit" size="sm" icon={Send} className="h-9" disabled={!text.trim()}>Send</Button>
        </form>
      </div>
      <p className="mt-3 text-xs text-muted">Try: “price of coconut oil”, “where is my order RSH-10340”, “damaged bottle”, “agent”. No AI provider is called — once a provider is configured on the backend, unmatched questions can be answered by the model.</p>
    </Modal>
  )
}

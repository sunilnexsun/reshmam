import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, GitBranch, List, Pencil, Plus } from 'lucide-react'
import { Badge, Button, EmptyState, IconButton, Segmented, Toggle, useToast } from '../../components/ui'
import { logActivity, updateItem, useDb } from '../../services/store'
import { cn } from '../../utils/format'
import FlowCanvas, { NODE_H } from './FlowCanvas'
import FlowEditModal from './FlowEditModal'

export default function FlowBuilder({ canManage }) {
  const db = useDb()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'visual' ? 'visual' : 'list'
  const [editing, setEditing] = useState(undefined)
  const flows = db.chatbot.flows
  const byId = Object.fromEntries(flows.map((f) => [f.id, f]))

  const onToggle = (f, enabled) => {
    updateItem('chatbot.flows', f.id, { enabled })
    logActivity('chatbot', `Chatbot flow ${enabled ? 'enabled' : 'disabled'}: ${f.name}`)
    toast.success(`${f.name} ${enabled ? 'enabled' : 'disabled'}`)
  }
  const newPosition = { x: 40, y: flows.length ? Math.max(...flows.map((f) => f.y || 0)) + NODE_H + 50 : 40 }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <Segmented value={view} onChange={(v) => setParams((p) => { p.set('tab', 'flows'); if (v === 'visual') p.set('view', 'visual'); else p.delete('view'); return p }, { replace: true })}
          options={[{ value: 'list', label: <span className="inline-flex items-center gap-1.5"><List className="h-3.5 w-3.5" />List</span> }, { value: 'visual', label: <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" />Visual editor</span> }]} />
        {canManage && <Button icon={Plus} className="h-9" onClick={() => setEditing(null)}>Add Step</Button>}
      </div>

      {flows.length === 0 ? (
        <EmptyState icon={GitBranch} title="No flow steps yet" text="Add the first step of your chatbot conversation." action={canManage && <Button icon={Plus} onClick={() => setEditing(null)}>Add Step</Button>} />
      ) : view === 'visual' ? (
        <FlowCanvas flows={flows} canManage={canManage} onEdit={(f) => setEditing(f)} />
      ) : (
        <ul className="divide-y divide-line">
          {flows.map((f, i) => (
            <li key={f.id} className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-start', !f.enabled && 'bg-surface/60')}>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold', f.enabled ? 'bg-accent-soft text-primary' : 'bg-gray-100 text-muted')}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{f.name}</p>
                  {!f.enabled && <Badge>Disabled</Badge>}
                </div>
                {f.question && <p className="mt-0.5 text-xs italic text-muted">Q: “{f.question}”</p>}
                <p className="mt-1.5 text-[13px] text-ink">{f.response}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(f.buttons || []).map((b) => <span key={b} className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] font-medium text-primary">{b}</span>)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span><b className="font-medium text-ink">Keywords:</b> {(f.keywords || []).join(', ') || '—'}</span>
                  <span className="inline-flex flex-wrap items-center gap-1"><b className="font-medium text-ink">Next:</b>{(f.next || []).length ? f.next.map((n) => byId[n] && <span key={n} className="inline-flex items-center gap-0.5"><ArrowRight className="h-3 w-3" />{byId[n].name}</span>) : ' End of conversation'}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:pt-1">
                <Toggle checked={f.enabled} onChange={(v) => onToggle(f, v)} disabled={!canManage} label={`${f.name} flow enabled`} size="sm" className="[&>label]:sr-only" />
                <IconButton icon={Pencil} variant="primary" size="sm" label={canManage ? `Edit ${f.name}` : `View ${f.name}`} onClick={() => setEditing(f)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <FlowEditModal open={editing !== undefined} flow={editing} flows={flows} position={newPosition} canManage={canManage} onClose={() => setEditing(undefined)} />
    </>
  )
}

import { useRef, useState } from 'react'
import { GripHorizontal, Maximize2, MessageSquareText, Minus, MousePointerClick, Plus } from 'lucide-react'
import { IconButton } from '@admin/_components/ui'
import { updateItem } from '@admin/_lib/store'
import { cn } from '@admin/_lib/format'

export const NODE_W = 220
export const NODE_H = 120
const GRID = 10
const snap = (n) => Math.max(0, Math.round(n / GRID) * GRID)

function curve(sx, sy, ex, ey, axis) {
  if (axis === 'x') { const d = Math.max(40, Math.abs(ex - sx) / 2) * Math.sign(ex - sx || 1); return `M${sx},${sy} C${sx + d},${sy} ${ex - d},${ey} ${ex},${ey}` }
  const d = Math.max(30, Math.abs(ey - sy) / 2) * Math.sign(ey - sy || 1)
  return `M${sx},${sy} C${sx},${sy + d} ${ex},${ey - d} ${ex},${ey}`
}
/** Bezier path between two nodes, leaving from the side that faces the target. */
function edgePath(a, b) {
  if (b.x >= a.x + NODE_W + 16) return curve(a.x + NODE_W, a.y + NODE_H / 2, b.x, b.y + NODE_H / 2, 'x')
  if (b.x + NODE_W + 16 <= a.x) return curve(a.x, a.y + NODE_H / 2, b.x + NODE_W, b.y + NODE_H / 2, 'x')
  return b.y >= a.y ? curve(a.x + NODE_W / 2, a.y + NODE_H, b.x + NODE_W / 2, b.y, 'y') : curve(a.x + NODE_W / 2, a.y, b.x + NODE_W / 2, b.y + NODE_H, 'y')
}

/** Visual flow editor: draggable nodes (pointer events) with SVG bezier connectors. */
export default function FlowCanvas({ flows, onEdit, canManage }) {
  const [zoom, setZoom] = useState(1)
  const [over, setOver] = useState({}) // id -> {x,y} while dragging
  const [active, setActive] = useState(null)
  const drag = useRef(null)

  const pos = (f) => over[f.id] || { x: f.x ?? 0, y: f.y ?? 0 }
  const byId = Object.fromEntries(flows.map((f) => [f.id, f]))
  const width = Math.max(980, ...flows.map((f) => pos(f).x + NODE_W + 80))
  const height = Math.max(520, ...flows.map((f) => pos(f).y + NODE_H + 80))
  const setZ = (z) => setZoom(Math.min(1.5, Math.max(0.5, Math.round(z * 10) / 10)))

  const onPointerDown = (e, f) => {
    if (e.button !== 0) return
    const p = pos(f)
    drag.current = { id: f.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false }
    if (canManage) e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || !canManage) return
    const dx = (e.clientX - d.sx) / zoom
    const dy = (e.clientY - d.sy) / zoom
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return
    d.moved = true
    setOver((o) => ({ ...o, [d.id]: { x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) } }))
  }
  const onPointerUp = (e, f) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved && canManage) {
      const p = over[f.id] || { x: d.ox, y: d.oy }
      updateItem('chatbot.flows', f.id, { x: snap(p.x), y: snap(p.y) })
      setOver((o) => { const n = { ...o }; delete n[f.id]; return n })
    } else onEdit(f)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const onKeyDown = (e, f) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(f); return }
    const step = e.shiftKey ? 50 : GRID
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!delta || !canManage) return
    e.preventDefault()
    const p = pos(f)
    updateItem('chatbot.flows', f.id, { x: snap(p.x + delta[0]), y: snap(p.y + delta[1]) })
  }

  const edges = flows.flatMap((f) => (f.next || []).filter((n) => byId[n]).map((n) => ({ from: f, to: byId[n] })))

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-xs text-muted"><MousePointerClick className="h-3.5 w-3.5" />{canManage ? 'Drag a step to move it · click to edit · arrow keys move a focused step' : 'Click a step to view it'}</p>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <IconButton icon={Minus} size="sm" variant="outline" label="Zoom out" onClick={() => setZ(zoom - 0.1)} disabled={zoom <= 0.5} />
          <span className="w-12 text-center text-xs font-medium tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <IconButton icon={Plus} size="sm" variant="outline" label="Zoom in" onClick={() => setZ(zoom + 0.1)} disabled={zoom >= 1.5} />
          <IconButton icon={Maximize2} size="sm" variant="outline" label="Reset zoom" onClick={() => setZoom(1)} />
        </div>
      </div>
      <div className="scroll-thin relative h-[560px] overflow-auto bg-surface" style={{ backgroundImage: 'radial-gradient(#d5ddd9 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px` }}>
        <div style={{ width: width * zoom, height: height * zoom }} className="relative">
          <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${zoom})` }}>
            <svg width={width} height={height} className="pointer-events-none absolute inset-0" aria-hidden>
              <defs>
                <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64716C" /></marker>
                <marker id="flow-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#16A34A" /></marker>
              </defs>
              {edges.map(({ from, to }) => {
                const on = active && (active === from.id || active === to.id)
                const off = !from.enabled || !to.enabled
                return <path key={`${from.id}-${to.id}`} d={edgePath(pos(from), pos(to))} fill="none" stroke={on ? '#16A34A' : '#9AA6A1'} strokeWidth={on ? 2.5 : 2} strokeDasharray={off ? '6 5' : undefined} markerEnd={`url(#${on ? 'flow-arrow-on' : 'flow-arrow'})`} />
              })}
            </svg>
            {flows.map((f) => {
              const p = pos(f)
              const dragging = !!over[f.id]
              return (
                <div key={f.id} role="button" tabIndex={0} aria-label={`${f.name} flow step${f.enabled ? '' : ' (disabled)'}. ${canManage ? 'Press Enter to edit, arrow keys to move.' : 'Press Enter to view.'}`}
                  onPointerDown={(e) => onPointerDown(e, f)} onPointerMove={onPointerMove} onPointerUp={(e) => onPointerUp(e, f)} onPointerCancel={() => { drag.current = null; setOver({}) }}
                  onKeyDown={(e) => onKeyDown(e, f)} onMouseEnter={() => setActive(f.id)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(f.id)} onBlur={() => setActive(null)}
                  data-flow-id={f.id}
                  style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H, touchAction: canManage ? 'none' : 'auto' }}
                  className={cn('absolute flex select-none flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-shadow', canManage ? 'cursor-grab' : 'cursor-pointer',
                    dragging && 'z-10 cursor-grabbing shadow-xl ring-2 ring-accent', f.enabled ? 'border-line hover:border-accent/60 hover:shadow-md' : 'border-dashed border-gray-300 opacity-70')}>
                  <div className={cn('flex items-center gap-2 px-3 py-2 text-white', f.enabled ? 'bg-primary' : 'bg-gray-500')}>
                    <MessageSquareText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{f.name}</span>
                    {canManage && <GripHorizontal className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
                  </div>
                  <div className="min-h-0 flex-1 px-3 py-2">
                    {f.question && <p className="truncate text-[11px] italic text-muted">“{f.question}”</p>}
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink">{f.response}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5 text-[10px] text-muted">
                    <span className="truncate">{(f.keywords || []).slice(0, 3).join(' · ') || 'No keywords'}</span>
                    <span className="shrink-0">{f.enabled ? `${(f.next || []).length} next` : 'Disabled'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

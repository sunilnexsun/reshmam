import { CheckCheck, ExternalLink, Reply } from 'lucide-react'
import { cn } from '@admin/_lib/format'

/** Renders WhatsApp-style bold/italic/strike markers (*b*, _i_, ~s~) safely as React nodes. */
function Formatted({ text }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g)
  return parts.map((p, i) => {
    if (/^\*[^*]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>
    if (/^_[^_]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
    if (/^~[^~]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>
    return <span key={i}>{p}</span>
  })
}

/** WhatsApp chat mock-up showing one business message (already rendered with sample values). */
export default function PhonePreview({ header, body, footer, buttons = [], businessName = 'RESHMAM', className }) {
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const btns = buttons.filter((b) => b && b.trim())
  return (
    <div className={cn('mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl', className)} aria-label="WhatsApp message preview">
      <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">R</span>
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{businessName}</p><p className="text-[10px] opacity-80">Business account</p></div>
      </div>
      <div className="min-h-[320px] bg-[#ECE5DD] px-2.5 py-3" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
        <p className="mx-auto mb-3 w-fit rounded-md bg-[#E1F3FB] px-2 py-0.5 text-[10px] text-gray-600">TODAY</p>
        <div className="max-w-[92%]">
          <div className="rounded-lg rounded-tl-none bg-white px-2.5 pt-2 pb-1 text-[13px] leading-snug text-gray-900 shadow-sm">
            {header && <p className="mb-1 font-bold break-words">{header}</p>}
            <p className="break-words whitespace-pre-wrap">{body ? <Formatted text={body} /> : <span className="text-gray-400">Message body will appear here…</span>}</p>
            {footer && <p className="mt-1 text-[11px] break-words text-gray-500">{footer}</p>}
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-gray-500">{time}<CheckCheck className="h-3 w-3 text-sky-500" aria-hidden /></p>
          </div>
          {btns.map((b, i) => (
            <div key={i} className="mt-0.5 flex items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[13px] font-medium text-[#00A5F4] shadow-sm">
              {/link|track|view|pay/i.test(b) ? <ExternalLink className="h-3.5 w-3.5" aria-hidden /> : <Reply className="h-3.5 w-3.5" aria-hidden />}{b}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

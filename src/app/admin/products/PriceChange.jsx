import { cn, inr } from '@admin/_lib/format'

/** Old → new amount with direction colour (used in price history tables). */
export default function PriceChange({ from, to }) {
  if (from == null) return <span className="whitespace-nowrap"><span className="text-muted">New · </span><b>{inr(to)}</b></span>
  if (from === to) return <span className="whitespace-nowrap text-muted">{inr(to)}</span>
  const up = to > from
  return (
    <span className="whitespace-nowrap">
      <span className="text-muted line-through">{inr(from)}</span> → <b className={up ? 'text-red-600' : 'text-accent'}>{inr(to)}</b>
      <span className={cn('ml-1 text-xs', up ? 'text-red-600' : 'text-accent')}>({up ? '+' : ''}{inr(to - from)})</span>
    </span>
  )
}

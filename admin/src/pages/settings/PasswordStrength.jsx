import { Check, X } from 'lucide-react'
import { cn } from '../../utils/format'
import { PASSWORD_RULES, passwordScore } from './passwordRules'

const LEVELS = [['Too weak', 'bg-red-500'], ['Too weak', 'bg-red-500'], ['Weak', 'bg-red-500'], ['Fair', 'bg-amber-500'], ['Good', 'bg-lime-500'], ['Strong', 'bg-accent']]

export default function PasswordStrength({ value = '' }) {
  const score = passwordScore(value)
  const [label, color] = LEVELS[score]
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= score && value ? color : 'bg-gray-200')} />)}</div>
        <span className="w-16 text-right text-xs font-medium text-muted">{value ? label : ''}</span>
      </div>
      <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value)
          return <li key={r.id} className={cn('flex items-center gap-1.5', ok ? 'text-accent' : 'text-muted')}>{ok ? <Check className="h-3.5 w-3.5" aria-label="met" /> : <X className="h-3.5 w-3.5" aria-label="not met" />}{r.label}</li>
        })}
      </ul>
    </div>
  )
}

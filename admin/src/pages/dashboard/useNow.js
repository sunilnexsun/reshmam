import { useEffect, useState } from 'react'

/** Current time, refreshed every `ms` (default 1 min) so "today"/"this week" ranges roll over without a reload. */
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t) }, [ms])
  return now
}

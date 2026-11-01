import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from './navigation'

/**
 * Filter state that is mirrored into the URL query (shareable links) but kept in React state as the
 * source of truth. Writing through a functional setSearchParams reads the params of the last render,
 * so two quick changes (e.g. typing a From date then a To date) could otherwise overwrite each other.
 * External URL changes (back/forward, links to the same page with another query) are adopted.
 * `defaults`: { key: defaultValue } — default/empty values are left out of the URL.
 */
export function useUrlState(defaults) {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const defaultsRef = useRef(defaults)
  const parse = (p) => Object.fromEntries(Object.entries(defaults).map(([k, d]) => [k, p.get(k) ?? d]))
  // `own` = query strings this hook wrote (or saw) — seeing one of them is not an external change.
  const [st, setSt] = useState(() => ({ values: parse(params), own: [search] }))
  let values = st.values
  if (!st.own.includes(search)) {
    values = parse(params)
    setSt({ values, own: [search] })
  } else if (st.own.length > 1 && st.own[st.own.length - 1] === search) {
    setSt({ values: st.values, own: [search] }) // latest write committed — forget older ones
  }
  const latest = useRef(values)
  useEffect(() => { latest.current = st.values }, [st.values])

  const set = useCallback((patch) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    const q = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => { if (v != null && v !== '' && v !== defaultsRef.current[k]) q.set(k, v) })
    const qs = q.toString()
    setSt((prev) => ({ values: next, own: [...prev.own.slice(-8), qs] }))
    setParams(q, { replace: true })
  }, [setParams])
  return [values, set]
}

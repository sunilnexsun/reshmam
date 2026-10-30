// Demo authentication against the users list in settings (frontend phase).
// Backend phase: replace login() with Supabase Auth / JWT; NEVER keep plain passwords client-side.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getState, setActor, updateItem, useDb } from './store'

const SESSION_KEY = 'reshmam-admin-session'
const AuthCtx = createContext(null)

const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
const RANK = { none: 0, view: 1, manage: 2 }

export function AuthProvider({ children }) {
  const db = useDb()
  const [session, setSession] = useState(readSession)
  const user = session ? db.settings.users.find((u) => u.id === session.userId && u.status === 'Active') || null : null
  useEffect(() => { setActor(user?.name) }, [user?.name])

  const value = useMemo(() => ({
    user,
    role: user ? db.settings.roles[user.role] : null,
    login(email, password, remember) {
      const u = getState().settings.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!u || u.password !== password) throw new Error('Invalid email or password.')
      if (u.status !== 'Active') throw new Error('This account is inactive. Contact the administrator.')
      const s = { userId: u.id, at: Date.now() }
      try {
        ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s))
        ;(remember ? sessionStorage : localStorage).removeItem(SESSION_KEY)
      } catch { /* storage blocked: session lasts until reload */ }
      updateItem('settings.users', u.id, { lastLogin: new Date().toISOString() })
      setSession(s)
      return u
    },
    logout() {
      try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
      setSession(null)
    },
    /** can('products') → can view ; can('products','manage') → can edit */
    can(module, level = 'view') {
      if (!user) return false
      const p = db.settings.roles[user.role]?.permissions?.[module] ?? 'none'
      return RANK[p] >= RANK[level]
    },
  }), [user, db.settings.roles])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export const useAuth = () => useContext(AuthCtx)

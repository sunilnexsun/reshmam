// Firestore-backed Authentication + Role-based permissions for admin panel.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getState, setActor, setState, updateItem, useDb } from './store'
import { auth } from './firebase'
import { signOut } from 'firebase/auth'

const SESSION_KEY = 'reshmam-admin-session'
const AuthCtx = createContext(null)

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}
const RANK = { none: 0, view: 1, manage: 2 }

function isBrowserApp() {
  return (
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string' &&
    window.location.origin.startsWith('http') &&
    !globalThis?.process?.env?.VITEST
  )
}

export function AuthProvider({ children }) {
  const db = useDb()
  const [session, setSession] = useState(readSession)

  const user = useMemo(() => {
    if (!session) return null
    return db.settings?.users?.find((u) => u.id === session.userId && u.status === 'Active') || null
  }, [session, db.settings?.users])

  useEffect(() => {
    setActor(user?.name)
  }, [user?.name])

  const value = useMemo(
    () => ({
      user,
      role: user && db.settings?.roles ? db.settings.roles[user.role] : null,
      async login(email, password, remember) {
        const cleanEmail = email.trim().toLowerCase()
        let activeUser = null

        if (isBrowserApp()) {
          // Authenticate live against Firestore `adminUsers` collection
          const res = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json.ok || !json.user) {
            throw new Error(json.error || 'Invalid email or password.')
          }
          activeUser = json.user

          // Ensure local store immediately has the authenticated user from Firestore
          setState((s) => {
            const existing = s.settings?.users || []
            const has = existing.some((u) => u.id === activeUser.id)
            const nextUsers = has
              ? existing.map((u) => (u.id === activeUser.id ? { ...u, ...activeUser } : u))
              : [activeUser, ...existing]
            return { ...s, settings: { ...s.settings, users: nextUsers } }
          })
        } else {
          // Fallback for unit test environment
          const stateUsers = getState().settings?.users || []
          const localUser = stateUsers.find((x) => (x.email || '').toLowerCase() === cleanEmail)
          if (!localUser || localUser.password !== password) {
            throw new Error('Invalid email or password.')
          }
          if (localUser.status !== 'Active') {
            throw new Error('This account is inactive. Contact the administrator.')
          }
          updateItem('settings.users', localUser.id, { lastLogin: new Date().toISOString() })
          activeUser = localUser
        }

        const s = { userId: activeUser.id, at: Date.now() }
        try {
          ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s))
          ;(remember ? sessionStorage : localStorage).removeItem(SESSION_KEY)
        } catch {}

        setSession(s)
        return activeUser
      },

      async logout() {
        try {
          await signOut(auth)
        } catch {}
        try {
          localStorage.removeItem(SESSION_KEY)
          sessionStorage.removeItem(SESSION_KEY)
        } catch {}
        setSession(null)
      },

      /** can('products') → can view ; can('products','manage') → can edit */
      can(module, level = 'view') {
        if (!user) return false
        const role = db.settings?.roles?.[user.role]
        let p = role?.permissions?.[module]
        if (p == null) {
          if (module === 'categories' || module === 'brands') {
            p = role?.permissions?.products ?? (user.role === 'Admin' || user.role === 'Manager' ? 'manage' : 'view')
          } else {
            p = user.role === 'Admin' ? 'manage' : 'none'
          }
        }
        return (RANK[p] ?? 0) >= (RANK[level] ?? 0)
      },
    }),
    [user, db.settings?.roles]
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export const useAuth = () => useContext(AuthCtx)

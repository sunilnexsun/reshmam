// Admin panel authentication: Firebase Auth (email + password) plus role-based permissions.
// The session is Firebase's; the staff record and role come from /api/admin/me.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { browserLocalPersistence, browserSessionPersistence, onAuthStateChanged, setPersistence } from 'firebase/auth'
import { setActor, startFirestoreSync, useDb } from './store'
import { auth } from './firebase'
import { fetchMe, resetStaffPassword, signInStaff, signOutStaff } from './staff-session'

const AuthCtx = createContext(null)
const RANK = { none: 0, view: 1, manage: 2 }

export function AuthProvider({ children }) {
  const db = useDb()
  const [staff, setStaff] = useState(null)
  // False until Firebase has restored (or ruled out) a saved session, so pages don't bounce to /login.
  const [ready, setReady] = useState(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, async (fbUser) => {
        const me = fbUser ? await fetchMe().catch(() => null) : null
        if (fbUser && !me) await signOutStaff().catch(() => {})
        setStaff(me)
        setReady(true)
      }),
    [],
  )

  // Admin data loads only for signed-in staff: the API and database refuse everyone else.
  useEffect(() => {
    if (staff) startFirestoreSync()
  }, [staff])

  // The live staff list (avatar etc.) refines the record from /api/admin/me.
  const user = useMemo(() => {
    if (!staff) return null
    const listed = db.settings?.users?.find((u) => u.id === staff.id)
    return { ...listed, ...staff }
  }, [staff, db.settings?.users])

  useEffect(() => {
    setActor(user?.name)
  }, [user?.name])

  const value = useMemo(
    () => ({
      user,
      ready,
      role: user && db.settings?.roles ? db.settings.roles[user.role] : null,
      async login(email, password, remember = true) {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
        const me = await signInStaff(email, password)
        setStaff(me)
        return me
      },
      async logout() {
        await signOutStaff().catch(() => {})
        setStaff(null)
      },
      resetPassword: resetStaffPassword,

      /** can('products') → can view ; can('products','manage') → can edit */
      can(module, level = 'view') {
        if (!user) return false
        if (user.role === 'Admin') return true
        const p = db.settings?.roles?.[user.role]?.permissions?.[module] ?? 'none'
        return (RANK[p] ?? 0) >= (RANK[level] ?? 0)
      },
    }),
    [user, ready, db.settings?.roles],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export const useAuth = () => useContext(AuthCtx)

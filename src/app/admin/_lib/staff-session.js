// Staff sign-in for the admin panel: Firebase Auth (email + password), then the staff record and role from
// /api/admin/me. Passwords are only ever sent to Firebase Auth, never stored or compared by this app.
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth'
import { auth, authHeader } from './firebase'

const NOT_STAFF = 'This account is not staff or is inactive.'

const WRONG_CREDENTIALS = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
  'auth/user-disabled',
])

/** The signed-in staff member's record, or null if they aren't active staff. */
export async function fetchMe() {
  const res = await fetch('/api/admin/me', { cache: 'no-store', headers: await authHeader() })
  const json = await res.json().catch(() => ({}))
  return res.ok && json.ok && json.user ? json.user : null
}

export async function signInStaff(email, password) {
  try {
    await signInWithEmailAndPassword(auth, String(email).trim().toLowerCase(), password)
  } catch (e) {
    if (WRONG_CREDENTIALS.has(e?.code)) throw new Error('Invalid email or password.')
    if (e?.code === 'auth/too-many-requests') throw new Error('Too many attempts. Please wait a few minutes and try again.')
    throw new Error('Could not sign in. Check your connection and try again.')
  }
  const user = await fetchMe()
  if (!user) {
    await signOut(auth).catch(() => {})
    throw new Error(NOT_STAFF)
  }
  return user
}

export const signOutStaff = () => signOut(auth)

export const resetStaffPassword = (email) => sendPasswordResetEmail(auth, String(email).trim().toLowerCase())

/** Changes the signed-in staff member's password: Firebase re-checks the current one first. */
export async function changeStaffPassword(current, next) {
  const user = auth.currentUser
  if (!user?.email) throw new Error('Please sign in again.')
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
  } catch (e) {
    if (WRONG_CREDENTIALS.has(e?.code)) throw new Error('Current password is incorrect')
    if (e?.code === 'auth/too-many-requests') throw new Error('Too many attempts. Please wait a few minutes and try again.')
    throw new Error('Could not check your password. Try again.')
  }
  await updatePassword(user, next)
}

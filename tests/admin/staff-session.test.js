// Staff sign-in for the admin panel: Firebase Auth email/password, then the staff record from /api/admin/me.
// Admin API calls carry the staff member's Firebase ID token.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fa = vi.hoisted(() => ({
  currentUser: null,
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
}))
vi.mock('firebase/auth', () => ({
  getAuth: () => fa,
  signInWithEmailAndPassword: (...a) => fa.signInWithEmailAndPassword(...a),
  signOut: (...a) => fa.signOut(...a),
  sendPasswordResetEmail: (...a) => fa.sendPasswordResetEmail(...a),
  reauthenticateWithCredential: (...a) => fa.reauthenticateWithCredential(...a),
  updatePassword: (...a) => fa.updatePassword(...a),
  EmailAuthProvider: { credential: (email, pw) => ({ email, pw }) },
  onAuthStateChanged: () => () => {},
}))

const staffUser = { getIdToken: async () => 'staff-token' }
let fetchMock
beforeEach(() => {
  vi.clearAllMocks()
  fa.currentUser = null
  fa.signInWithEmailAndPassword.mockImplementation(async () => {
    fa.currentUser = staffUser
    return { user: staffUser }
  })
  fetchMock = vi.fn(async () => Response.json({ ok: true, user: { id: 'u1', name: 'A', role: 'Admin', status: 'Active' } }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const { changeStaffPassword, signInStaff, signOutStaff, resetStaffPassword } = await import('@admin/_lib/staff-session')
const { authHeader } = await import('@admin/_lib/firebase')

describe('signInStaff', () => {
  it('signs in with Firebase Auth and returns the staff record from /api/admin/me', async () => {
    const user = await signInStaff('A@X.com ', 'pw')
    expect(fa.signInWithEmailAndPassword).toHaveBeenCalledWith(fa, 'a@x.com', 'pw')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/me', expect.objectContaining({ headers: { Authorization: 'Bearer staff-token' } }))
    expect(user).toMatchObject({ id: 'u1', role: 'Admin' })
  })
  it('signs back out and explains when the account is not active staff', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: false, error: 'x' }, { status: 403 }))
    await expect(signInStaff('c@x.com', 'pw')).rejects.toThrow('This account is not staff or is inactive.')
    expect(fa.signOut).toHaveBeenCalled()
  })
  it('reports server errors instead of blaming the staff account', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    await expect(signInStaff('a@x.com', 'pw')).rejects.toThrow('Server error (HTTP 500)')
    expect(fa.signOut).toHaveBeenCalled()
  })
  it('turns a wrong password into a plain message', async () => {
    fa.signInWithEmailAndPassword.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }))
    await expect(signInStaff('a@x.com', 'bad')).rejects.toThrow('Invalid email or password.')
  })
})

describe('signing out and resetting', () => {
  it('signOutStaff signs out of Firebase', async () => {
    await signOutStaff()
    expect(fa.signOut).toHaveBeenCalledWith(fa)
  })
  it('resetStaffPassword sends Firebase\'s reset email', async () => {
    await resetStaffPassword(' A@x.com')
    expect(fa.sendPasswordResetEmail).toHaveBeenCalledWith(fa, 'a@x.com')
  })
})

describe('authHeader', () => {
  it('carries the signed-in staff member\'s ID token', async () => {
    fa.currentUser = staffUser
    expect(await authHeader()).toEqual({ Authorization: 'Bearer staff-token' })
  })
  it('is empty when nobody is signed in', async () => {
    expect(await authHeader()).toEqual({})
  })
})

describe('changeStaffPassword', () => {
  const me = { email: 'a@x.com', getIdToken: async () => 't' }
  it('re-checks the current password with Firebase, then sets the new one', async () => {
    fa.currentUser = me
    await changeStaffPassword('old-pw', 'New-pw-123!')
    expect(fa.reauthenticateWithCredential).toHaveBeenCalledWith(me, { email: 'a@x.com', pw: 'old-pw' })
    expect(fa.updatePassword).toHaveBeenCalledWith(me, 'New-pw-123!')
  })
  it('says so plainly when the current password is wrong', async () => {
    fa.currentUser = me
    fa.reauthenticateWithCredential.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }))
    await expect(changeStaffPassword('bad', 'New-pw-123!')).rejects.toThrow('Current password is incorrect')
    expect(fa.updatePassword).not.toHaveBeenCalled()
  })
})

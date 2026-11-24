// Staff accounts are managed through /api/admin/staff (Firebase Auth); the store never writes adminUsers
// directly and never saves a password anywhere.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fbMod = vi.hoisted(() => ({
  saveDocument: vi.fn(async () => {}),
  deleteDocument: vi.fn(async () => {}),
  batchFirestore: vi.fn(async () => {}),
}))
vi.mock('@admin/_lib/firebase', () => ({
  saveDocument: fbMod.saveDocument,
  deleteDocument: fbMod.deleteDocument,
  batchFirestore: fbMod.batchFirestore,
  subscribeCollection: () => () => {},
  getPendingWrites: () => 0,
  getWriteVersion: () => 0,
  authHeader: async () => ({ Authorization: 'Bearer staff-token' }),
  db: {},
}))

const { buildSeed } = await import('@admin/_lib/seed')
const { createStaff, getState, removeItem, setState, updateItem, updateSection } = await import('@admin/_lib/store')

let fetchMock
beforeEach(() => {
  vi.clearAllMocks()
  setState(buildSeed())
  fetchMock = vi.fn(async () => Response.json({ ok: true, user: { id: 'fb-uid-1', name: 'New', email: 'new@x.com', role: 'Staff', status: 'Active' }, resetLink: 'https://reset/link' }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('settings are saved without staff or passwords', () => {
  it('updateSection saves configs/settings without the users list or any password', () => {
    updateSection('settings.tax', { defaultGst: 12 })
    const call = fbMod.saveDocument.mock.calls.find((c) => c[0] === 'configs' && c[1] === 'settings')
    expect(call).toBeTruthy()
    expect(call[2].users).toBeUndefined()
    expect(JSON.stringify(call[2])).not.toContain('password')
    expect(call[2].tax.defaultGst).toBe(12)
  })
})

describe('staff go through the staff API', () => {
  it('createStaff posts to /api/admin/staff with the token, adds the returned user, and returns the reset link', async () => {
    const res = await createStaff({ name: 'New', email: 'new@x.com', role: 'Staff', status: 'Active', branchId: 'all', phone: '' })
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/staff', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer staff-token' }) }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).password).toBeUndefined()
    expect(res.resetLink).toBe('https://reset/link')
    expect(getState().settings.users.some((u) => u.id === 'fb-uid-1')).toBe(true)
    expect(fbMod.saveDocument).not.toHaveBeenCalledWith('adminUsers', expect.anything(), expect.anything(), expect.anything())
  })
  it('updating a staff member PATCHes the staff API, never writing adminUsers or a password', async () => {
    const u = getState().settings.users[1]
    updateItem('settings.users', u.id, { name: 'Renamed', password: 'should-not-travel' })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/staff', expect.objectContaining({ method: 'PATCH' }))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({ uid: u.id, name: 'Renamed' })
    expect(body.password).toBeUndefined()
    expect(fbMod.saveDocument).not.toHaveBeenCalledWith('adminUsers', expect.anything(), expect.anything(), expect.anything())
  })
  it('removing a staff member DELETEs through the staff API', async () => {
    const u = getState().settings.users[2]
    removeItem('settings.users', u.id)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/staff?uid=${encodeURIComponent(u.id)}`, expect.objectContaining({ method: 'DELETE' }))
    expect(fbMod.deleteDocument).not.toHaveBeenCalledWith('adminUsers', expect.anything())
  })
})

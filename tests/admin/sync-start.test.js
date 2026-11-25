// Admin data must load only for signed-in staff. Loading the admin code (for example on the login page) must
// not start the Firestore sync: the requests would be refused, and because the sync starts only once, the
// start after sign-in would then do nothing (no live updates for staff).
import { afterEach, describe, expect, it, vi } from 'vitest'

const fb = vi.hoisted(() => ({ subscribe: vi.fn(() => () => {}) }))
vi.mock('@admin/_lib/firebase', () => ({
  saveDocument: vi.fn(), deleteDocument: vi.fn(), batchFirestore: vi.fn(),
  subscribeCollection: fb.subscribe, getPendingWrites: () => 0, getWriteVersion: () => 0,
  authHeader: async () => ({}), db: {},
}))
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), getDocs: vi.fn(async () => ({ docs: [] })) }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('admin data sync', () => {
  it('does not start just because the admin code loaded', async () => {
    vi.resetModules()
    vi.stubEnv('VITEST', '')
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 401 }))
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage }))
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
    await import('@admin/_lib/store')
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(fb.subscribe).not.toHaveBeenCalled()
  })
})

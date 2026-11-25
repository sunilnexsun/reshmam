// `npm run dev:demo`: the admin panel signs in against the local Firebase emulators (so the old demo logins
// work on this computer), and never does so in a production build.
import { afterEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({ auth: [], firestore: [], storage: [] }))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })), getApps: vi.fn(() => []) }))
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})), connectAuthEmulator: vi.fn((_a, url) => calls.auth.push(url)) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})), getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn((_d, host, port) => calls.firestore.push(`${host}:${port}`)),
  doc: vi.fn(), setDoc: vi.fn(), collection: vi.fn(), onSnapshot: vi.fn(), deleteDoc: vi.fn(),
}))
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})), connectStorageEmulator: vi.fn((_s, host, port) => calls.storage.push(`${host}:${port}`)),
  ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn(), deleteObject: vi.fn(),
}))

async function load(env) {
  vi.resetModules()
  calls.auth.length = calls.firestore.length = calls.storage.length = 0
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  return import('@/app/admin/_lib/firebase')
}
afterEach(() => vi.unstubAllEnvs())

describe('admin demo mode', () => {
  it('connects to the local emulators when switched on in development', async () => {
    const mod = await load({ NODE_ENV: 'development', NEXT_PUBLIC_FIREBASE_EMULATORS: '1' })
    expect(mod.demoMode).toBe(true)
    expect(calls).toEqual({ auth: ['http://127.0.0.1:9099'], firestore: ['127.0.0.1:8080'], storage: ['127.0.0.1:9199'] })
  })
  it('never does in production', async () => {
    const mod = await load({ NODE_ENV: 'production', NEXT_PUBLIC_FIREBASE_EMULATORS: '1' })
    expect(mod.demoMode).toBe(false)
    expect(calls).toEqual({ auth: [], firestore: [], storage: [] })
  })
  it('is off unless switched on', async () => {
    const mod = await load({ NODE_ENV: 'development', NEXT_PUBLIC_FIREBASE_EMULATORS: '' })
    expect(mod.demoMode).toBe(false)
    expect(calls.auth).toEqual([])
  })
})

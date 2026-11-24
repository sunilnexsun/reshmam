// The admin panel and the storefront's customer sign-in each have their own Firebase app. When the named
// customer app is created first (as happens when pages are prerendered together), the admin panel must still
// get the default app instead of crashing with "No Firebase App '[DEFAULT]'".
import { describe, expect, it } from 'vitest'
import { getApps, initializeApp } from 'firebase/app'

describe('admin Firebase app', () => {
  it('uses the default app even when another named app already exists', async () => {
    initializeApp({ apiKey: 'x', projectId: 'demo-reshmam', appId: '1:1:web:1' }, 'reshmam-customer')
    const { app } = await import('@/app/admin/_lib/firebase')
    expect(app.name).toBe('[DEFAULT]')
    expect(getApps().map((a) => a.name).sort()).toEqual(['[DEFAULT]', 'reshmam-customer'])
  })
})

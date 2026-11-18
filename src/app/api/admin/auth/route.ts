import { NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDWfC3Z-5nYzmDKIoLRwRCAkCQhIKQH8LI",
  authDomain: "reshmam-oil.firebaseapp.com",
  projectId: "reshmam-oil",
  storageBucket: "reshmam-oil.firebasestorage.app",
  messagingSenderId: "245127746311",
  appId: "1:245127746311:web:fb9041eea8686cb0e06ba2"
}

const APP_NAME = 'admin-server-app'
const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(firebaseConfig, APP_NAME)
const db = getFirestore(app)

interface AdminUserDoc {
  id: string
  name: string
  email: string
  password: string
  role: string
  branchId?: string
  phone?: string
  status?: string
  lastLogin?: string
  avatar?: string
  createdAt?: string
  updatedAt?: string
}

export async function GET() {
  try {
    const snap = await getDocs(collection(db, 'adminUsers'))
    const users = snap.docs
      .map((d) => {
        const { password: _pw, ...safe } = d.data() as Omit<AdminUserDoc, 'id'>
        return { id: d.id, ...safe }
      })
      .sort((a, b) => {
        const order: Record<string, number> = { Admin: 1, Manager: 2, Staff: 3 }
        return (order[a.role] ?? 99) - (order[b.role] ?? 99) || (a.name || '').localeCompare(b.name || '')
      })

    return NextResponse.json(
      { ok: true, users },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const cleanEmail = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!cleanEmail || !password) {
      return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 })
    }

    const snap = await getDocs(collection(db, 'adminUsers'))
    const users = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminUserDoc, 'id'>) }))
    const matched = users.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail)

    if (!matched || matched.password !== password) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 })
    }

    if (matched.status !== 'Active') {
      return NextResponse.json(
        { ok: false, error: 'This account is inactive. Contact the administrator.' },
        { status: 403 }
      )
    }

    const lastLogin = new Date().toISOString()
    await setDoc(doc(db, 'adminUsers', matched.id), { lastLogin, updatedAt: lastLogin }, { merge: true })

    return NextResponse.json({
      ok: true,
      user: { ...matched, lastLogin, updatedAt: lastLogin },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed'
    console.error('[Admin Auth API] Error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

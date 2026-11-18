import { NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'

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

const COLLECTIONS = [
  'adminUsers',
  'categories',
  'brands',
  'branches',
  'products',
  'variants',
  'customers',
  'orders',
  'stockMovements',
  'priceHistory',
  'coupons',
  'campaigns',
  'banners',
  'activities',
]

const CONFIG_KEYS = ['settings', 'whatsapp', 'chatbot']

function sanitize(val: unknown): unknown {
  if (val === undefined) return null
  if (val === null || typeof val !== 'object') return val
  if (val instanceof Date) return val.toISOString()
  if (Array.isArray(val)) return val.map(sanitize)
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = sanitize(v)
    }
  }
  return clean
}

export async function GET() {
  try {
    const data: Record<string, unknown[]> = {}
    const configs: Record<string, Record<string, unknown>> = {}

    await Promise.all([
      ...COLLECTIONS.map(async (col) => {
        try {
          const snap = await getDocs(collection(db, col))
          data[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn(`Server Firestore getDocs error on ${col}:`, msg)
          data[col] = []
        }
      }),
      (async () => {
        try {
          const snap = await getDocs(collection(db, 'configs'))
          snap.docs.forEach((d) => {
            if (CONFIG_KEYS.includes(d.id)) {
              const docData = d.data()
              // Strip helper metadata fields if present
              const { id: _id, updatedAt: _u, ...rest } = docData
              configs[d.id] = rest
            }
          })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn('Server Firestore getDocs error on configs:', msg)
        }
      })(),
    ])

    return NextResponse.json({ ok: true, data, configs }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, col, id, data, merge = true, operations } = body

    if (action === 'batch' && Array.isArray(operations)) {
      for (const op of operations) {
        if (!op?.col || !op?.id) continue
        const dRef = doc(db, String(op.col), String(op.id))
        if (op.type === 'delete') {
          await deleteDoc(dRef)
        } else {
          const cData = sanitize({
            ...(op.data || {}),
            id: String(op.id),
            updatedAt: new Date().toISOString(),
          }) as Record<string, unknown>
          await setDoc(dRef, cData, { merge: op.merge !== false })
        }
      }
      return NextResponse.json({ ok: true, action: 'batch', count: operations.length })
    }

    if (!col || !id) {
      return NextResponse.json({ ok: false, error: 'Missing col or id' }, { status: 400 })
    }

    const docRef = doc(db, String(col), String(id))

    if (action === 'delete') {
      await deleteDoc(docRef)
      return NextResponse.json({ ok: true, action: 'deleted', col, id: String(id) })
    }

    // Save / update
    const cleanData = sanitize({
      ...(data || {}),
      id: String(id),
      updatedAt: new Date().toISOString(),
    }) as Record<string, unknown>
    await setDoc(docRef, cleanData, { merge: merge !== false })
    return NextResponse.json({ ok: true, action: 'saved', col, id: String(id) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    console.error('[Server API] Firestore operation failed:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

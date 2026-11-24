// Central data store for the admin panel.
// Frontend phase: the whole database lives in one object persisted to localStorage.
// Backend phase: keep the same action names and swap their bodies for REST/Supabase calls
// (e.g. `api.patch('/orders/:id/status')`) — pages only call these actions and `useDb()`.
import { useSyncExternalStore } from 'react'
import { buildSeed, SEED_VERSION } from './seed'
import { orderGst } from './gst'
import { issueInvoice, withIssuedInvoices } from './invoice'
import { normSize, variantSku } from '@admin/products/productUtils'
import { uid } from './format'
import { saveDocument, deleteDocument, batchFirestore, subscribeCollection, getPendingWrites, getWriteVersion, authHeader, db as firestore } from './firebase'
import { collection, getDocs } from 'firebase/firestore'

const KEY = 'reshmam-admin-v1'
/** Where saved data that can't be upgraded is kept, so it is never silently thrown away. */
export const BACKUP_KEY = `${KEY}-backup`
const listeners = new Set()

/**
 * Upgrades saved data one version at a time: MIGRATIONS[n] turns version n-1 data into version n.
 * When SEED_VERSION goes up, add a step here instead of letting old data be replaced by the seed.
 */
const MIGRATIONS = {
  // v3: order.tax is the GST after the coupon discount (it used to be worked out on the full item prices).
  3: (db) => ({ ...db, orders: db.orders.map((o) => ({ ...o, tax: orderGst(o) })) }),
  // v4: confirmed orders carry the invoice issued when they were confirmed (number, date, seller, tax).
  4: (db) => withIssuedInvoices(db),
  // v5: add categories & brands collections
  5: (db) => {
    const seed = buildSeed()
    return {
      ...db,
      categories: Array.isArray(db.categories) && db.categories.length ? db.categories : seed.categories,
      brands: Array.isArray(db.brands) && db.brands.length ? db.brands : seed.brands,
    }
  },
}

const LISTS = ['branches', 'products', 'variants', 'categories', 'brands', 'customers', 'orders', 'stockMovements', 'priceHistory', 'coupons', 'campaigns', 'banners', 'activities']
const OBJECTS = ['whatsapp', 'chatbot', 'settings']
/** True when `data` has core collections the screens read, so an older snapshot can be upgraded. */
const hasDbShape = (data) =>
  ['branches', 'products', 'variants', 'customers', 'orders'].every((k) => Array.isArray(data?.[k])) &&
  OBJECTS.every((k) => data?.[k] && typeof data[k] === 'object')

/**
 * Returns the data at SEED_VERSION, or null when it can't be used: a step is missing, it is newer than this
 * code, or a collection is missing or damaged.
 */
export function migrate(data) {
  let version = data?.meta?.version
  if (typeof version !== 'number' || version > SEED_VERSION || !hasDbShape(data)) return null
  while (version < SEED_VERSION) {
    const step = MIGRATIONS[version + 1]
    if (!step) return null
    data = step(data)
    version += 1
    data = { ...data, meta: { ...data.meta, version } }
  }
  return hasDbShape(data) ? data : null
}

let loadNotice = null
/** Set when saved data couldn't be loaded and was moved to BACKUP_KEY; the layout shows it once. */
export const takeLoadNotice = () => { const n = loadNotice; loadNotice = null; return n }

let state = load()

function load() {
  let raw = null
  try { raw = localStorage.getItem(KEY) } catch { return buildSeed() } // storage unavailable
  if (!raw) return buildSeed()
  try {
    const saved = JSON.parse(raw)
    const data = migrate(saved)
    if (data) {
      // Save the upgraded copy straight away, so other tabs and later loads see the new version.
      if (data !== saved) try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignore */ }
      return data
    }
  } catch { /* corrupt JSON — handled below */ }
  // Keep the old data recoverable rather than overwriting it with sample data.
  try { localStorage.setItem(BACKUP_KEY, raw) } catch { /* ignore */ }
  loadNotice = `Your saved admin data could not be upgraded to this version, so sample data was loaded. The previous data was kept in this browser under "${BACKUP_KEY}".`
  console.warn(loadNotice)
  return buildSeed()
}
let saveTimer
// Whether the last save failed (usually: the browser's ~5 MB storage is full, e.g. after image uploads).
// The admin layout shows a banner while it is true, so changes are never lost without warning.
let saveFailed = false
const saveListeners = new Set()
function setSaveFailed(failed) {
  if (failed === saveFailed) return
  saveFailed = failed
  saveListeners.forEach((l) => l())
}
export const isSaveFailing = () => saveFailed
export const useSaveFailed = () =>
  useSyncExternalStore((l) => (saveListeners.add(l), () => saveListeners.delete(l)), isSaveFailing, () => false)

function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
      setSaveFailed(false)
    } catch (e) {
      console.warn('Could not save admin data (storage full?)', e)
      setSaveFailed(true)
    }
  }, 120)
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {
      e.preventDefault() // the latest changes can't be saved: ask before leaving
      e.returnValue = ''
    }
  })
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return
    // Another tab (possibly running older code) saved: upgrade its data like load() does, and keep ours if
    // it is unreadable or can't be upgraded.
    let next = null
    try { next = migrate(JSON.parse(e.newValue)) } catch { return }
    if (!next) return
    state = next
    listeners.forEach((l) => l())
  })
}

export const getState = () => state
export function setState(updater) {
  state = typeof updater === 'function' ? updater(state) : updater
  persist()
  listeners.forEach((l) => l())
}
const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))

/** Whole database snapshot (stable reference until something changes). Derive with useMemo. */
export const useDb = () => useSyncExternalStore(subscribe, getState)

// Who is performing the action (set by AuthProvider) — recorded in histories.
let actor = 'Admin'
export const setActor = (name) => { actor = name || 'Admin' }
export const getActor = () => actor
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Firestore Real-Time Cloud Synchronization
// ---------------------------------------------------------------------------
const FIRESTORE_LISTS = ['adminUsers', 'categories', 'brands', 'branches', 'products', 'variants', 'customers', 'orders', 'stockMovements', 'priceHistory', 'coupons', 'campaigns', 'banners', 'activities']

/** Sync whole database seed to Firestore */
export async function syncSeedToFirestore(data = getState()) {
  try {
    const seed = buildSeed()
    const collectionsToSync = ['categories', 'brands', 'branches', 'products', 'variants', 'customers', 'orders', 'stockMovements', 'priceHistory', 'coupons', 'campaigns', 'banners', 'activities']
    for (const col of collectionsToSync) {
      const items = Array.isArray(data[col]) && data[col].length ? data[col] : seed[col]
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.id) {
            await saveDocument(col, item.id, item)
          }
        }
      }
    }
    return true
  } catch (err) {
    console.warn('Sync seed to Firestore notice:', err)
    return false
  }
}

let activeUnsubs = []
let syncStarted = false

function canonicalJson(val) {
  if (val === null || val === undefined || typeof val !== 'object') return JSON.stringify(val)
  if (Array.isArray(val)) {
    // Compare arrays of docs by id so Firestore doc ordering differences don't trigger unnecessary state churn
    const hasIds = val.length > 0 && val.every((x) => x && typeof x === 'object' && 'id' in x)
    const arr = hasIds ? [...val].sort((a, b) => String(a.id).localeCompare(String(b.id))) : val
    return '[' + arr.map(canonicalJson).join(',') + ']'
  }
  const keys = Object.keys(val).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(val[k])).join(',') + '}'
}

function sameValue(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false
  return canonicalJson(a) === canonicalJson(b)
}

/** Removes every `password` key, at any depth. */
function withoutPasswords(value) {
  if (Array.isArray(value)) return value.map(withoutPasswords)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'password').map(([k, v]) => [k, withoutPasswords(v)]))
  }
  return value
}

function persistConfigSection(path) {
  const topKey = path.split('.')[0]
  if (OBJECTS.includes(topKey)) {
    let sectionData = getState()[topKey]
    // Staff live in adminUsers (managed through /api/admin/staff), never in the settings document.
    if (topKey === 'settings' && sectionData) {
      const { users: _users, ...rest } = sectionData
      sectionData = rest
    }
    if (sectionData && typeof sectionData === 'object') {
      saveDocument('configs', topKey, withoutPasswords(sectionData), { merge: false }).catch((e) =>
        console.warn(`Firestore config save error on ${topKey}:`, e)
      )
    }
  }
}

export async function fetchAllFromFirestore() {
  if (typeof window === 'undefined' || globalThis?.process?.env?.VITEST) return
  if (getPendingWrites() > 0) return

  const versionAtStart = getWriteVersion()

  // 1. Fetch via server-side proxy API (bypasses browser ad-blockers and streaming errors)
  try {
    const res = await fetch('/api/admin/firestore', { cache: 'no-store', headers: await authHeader() })
    if (res.ok) {
      const json = await res.json()
      if (json.ok && json.data) {
        // Abort if any local edit/delete started while this fetch was in flight
        if (getPendingWrites() > 0 || getWriteVersion() !== versionAtStart) return

        const current = getState()
        const updates = {}
        let changed = false

        for (const [colName, items] of Object.entries(json.data)) {
          if (colName === 'adminUsers') continue
          if (Array.isArray(items) && !sameValue(current[colName], items)) {
            updates[colName] = items
            changed = true
          }
        }

        if (json.configs && typeof json.configs === 'object') {
          for (const [cfgKey, cfgVal] of Object.entries(json.configs)) {
            if (OBJECTS.includes(cfgKey) && cfgVal && typeof cfgVal === 'object' && Object.keys(cfgVal).length > 0) {
              // Keep live adminUsers collection as source of truth for settings.users
              const cleanedCfg = cfgKey === 'settings' ? (({ users: _u, ...rest }) => rest)(cfgVal) : cfgVal
              const mergedCfg = { ...current[cfgKey], ...cleanedCfg }
              if (!sameValue(current[cfgKey], mergedCfg)) {
                updates[cfgKey] = mergedCfg
                changed = true
              }
            }
          }
        }

        // Sync live Firestore adminUsers into settings.users
        if (Array.isArray(json.data.adminUsers)) {
          const baseSettings = updates.settings || current.settings || {}
          if (!sameValue(baseSettings.users, json.data.adminUsers)) {
            updates.settings = { ...baseSettings, users: json.data.adminUsers }
            changed = true
          }
        }

        if (changed) {
          setState((s) => ({ ...s, ...updates }))
        }
        return
      }
    }
  } catch (apiErr) {
    console.warn('[Firestore] Server proxy fetch error, falling back to direct SDK:', apiErr)
  }

  // 2. Client SDK fallback
  await Promise.all(
    FIRESTORE_LISTS.map(async (colName) => {
      try {
        const snap = await getDocs(collection(firestore, colName))
        if (getPendingWrites() > 0 || getWriteVersion() !== versionAtStart) return
        const items = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        if (colName === 'adminUsers') {
          if (!sameValue(getState().settings?.users, items)) {
            setState((s) => ({ ...s, settings: { ...s.settings, users: items } }))
          }
        } else if (!sameValue(getState()[colName], items)) {
          setState((s) => ({
            ...s,
            [colName]: items,
          }))
        }
      } catch (err) {
        console.warn(`Firestore initial fetch error on ${colName}:`, err?.message || err)
      }
    })
  )
}

export function startFirestoreSync() {
  if (typeof window === 'undefined' || globalThis?.process?.env?.VITEST) return
  if (syncStarted) return
  syncStarted = true

  // 1. Immediate fetch
  fetchAllFromFirestore()

  // 2. Gentle background sync every 15s (only applies if changed and no writes in flight)
  setInterval(() => {
    if (document.visibilityState === 'visible' && getPendingWrites() === 0) {
      fetchAllFromFirestore()
    }
  }, 15000)

  // 3. Re-sync when tab returns to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getPendingWrites() === 0) {
      fetchAllFromFirestore()
    }
  })

  // 4. Real-time live listeners
  if (activeUnsubs.length > 0) return

  FIRESTORE_LISTS.forEach((colName) => {
    try {
      const unsub = subscribeCollection(
        colName,
        (items, meta) => {
          // Ignore stale local-cache snapshots or snapshots arriving while a local write is committing
          if (meta?.fromCache || meta?.hasPendingWrites || getPendingWrites() > 0) return
          if (!Array.isArray(items)) return
          if (colName === 'adminUsers') {
            if (!sameValue(getState().settings?.users, items)) {
              setState((s) => ({ ...s, settings: { ...s.settings, users: items } }))
            }
          } else if (!sameValue(getState()[colName], items)) {
            setState((s) => ({
              ...s,
              [colName]: items,
            }))
          }
        },
        () => {
          // Handled silently by server proxy polling
        }
      )
      if (typeof unsub === 'function') {
        activeUnsubs.push(unsub)
      }
    } catch (err) {
      // Handled silently
    }
  })
}

if (typeof window !== 'undefined' && !globalThis?.process?.env?.VITEST) {
  startFirestoreSync()
}

// ---------------------------------------------------------------------------
// Generic collection helpers. `col` is a top-level array key, e.g. 'customers'.
// For nested arrays use a path: 'whatsapp.templates', 'chatbot.flows', 'settings.users'.
// ---------------------------------------------------------------------------
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
function setPath(obj, path, value) {
  const [k, ...rest] = path.split('.')
  return { ...obj, [k]: rest.length ? setPath(obj[k] ?? {}, rest.join('.'), value) : value }
}

// ---------------------------------------------------------------------------
// Staff accounts: Firebase Auth users + adminUsers records, managed only through /api/admin/staff (Admin
// role). No password is ever sent from here or stored; new staff get a reset link to set their own.
// ---------------------------------------------------------------------------
const STAFF_FIELDS = ['name', 'phone', 'role', 'branchId', 'status', 'avatar']

async function staffRequest(method, { query = '', body } = {}) {
  const res = await fetch(`/api/admin/staff${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.ok) throw new Error(json.error || `Staff update failed (HTTP ${res.status})`)
  return json
}

/** Creates a staff member. Returns { user, resetLink } — share the link so they can set their password. */
export async function createStaff(data) {
  const body = Object.fromEntries([...STAFF_FIELDS, 'email'].filter((k) => data[k] !== undefined).map((k) => [k, data[k]]))
  const { user, resetLink } = await staffRequest('POST', { body })
  setState((s) => ({ ...s, settings: { ...s.settings, users: [user, ...(s.settings?.users || [])] } }))
  logActivity('settings', `User added: ${user.name}`)
  return { user, resetLink }
}

export function createItem(col, data, prefix = col.split('.').pop().slice(0, 3)) {
  if (col === 'settings.users') throw new Error('Use createStaff() to add staff.')
  const item = { id: data?.id || uid(prefix), createdAt: now(), ...data }
  setState((s) => setPath(s, col, [item, ...(getPath(s, col) || [])]))
  if (!col.includes('.')) {
    saveDocument(col, item.id, item, { merge: false }).catch((e) => console.warn(`Firestore save error on ${col}:`, e))
    logActivity(col, `Added ${col}: ${item.name || item.title || item.id}`)
  } else {
    persistConfigSection(col)
  }
  return item
}
export function updateItem(col, id, patch) {
  let updated = null
  setState((s) => setPath(s, col, (getPath(s, col) || []).map((x) => {
    if (x.id === id) {
      updated = { ...x, ...(typeof patch === 'function' ? patch(x) : patch), updatedAt: now() }
      return updated
    }
    return x
  })))
  if (col === 'settings.users' && updated) {
    const p = typeof patch === 'function' ? updated : patch
    const changes = Object.fromEntries(STAFF_FIELDS.filter((k) => p[k] !== undefined).map((k) => [k, p[k]]))
    if (Object.keys(changes).length) {
      staffRequest('PATCH', { body: { uid: id, ...changes } }).catch((e) => console.warn('Staff update failed:', e))
    }
  } else if (!col.includes('.') && updated) {
    saveDocument(col, id, updated, { merge: false }).catch((e) => console.warn(`Firestore update error on ${col}:`, e))
    logActivity(col, `Updated ${col}: ${updated.name || updated.title || id}`)
  } else if (col.includes('.') && updated) {
    persistConfigSection(col)
  }
}
export function removeItem(col, id) {
  const currentItem = (getPath(state, col) || []).find((x) => x.id === id)
  setState((s) => setPath(s, col, (getPath(s, col) || []).filter((x) => x.id !== id)))
  if (col === 'settings.users') {
    staffRequest('DELETE', { query: `?uid=${encodeURIComponent(id)}` }).catch((e) => console.warn('Staff delete failed:', e))
  } else if (!col.includes('.')) {
    deleteDocument(col, id).catch((e) => console.warn(`Firestore delete error on ${col}:`, e))
    logActivity(col, `Deleted ${col}: ${currentItem?.name || currentItem?.title || id}`)
  } else {
    persistConfigSection(col)
  }
}
/** Shallow-merge into an object section, e.g. updateSection('settings.tax', { defaultGst: 12 }) */
export function updateSection(path, patch) {
  setState((s) => setPath(s, path, { ...(getPath(s, path) || {}), ...patch }))
  persistConfigSection(path)
}

export function logActivity(type, message) {
  const act = { id: uid('ac'), type, message, user: actor, at: now() }
  setState((s) => ({ ...s, activities: [act, ...(s.activities || [])].slice(0, 300) }))
  saveDocument('activities', act.id, act, { merge: false }).catch((e) => console.warn('Activity save error:', e))
}

// ---------------------------------------------------------------------------
// Products & variants
// ---------------------------------------------------------------------------
/** Create or update a product. `variants` (optional) replaces the product's variant list. */
export function saveProduct(product, variants) {
  const isNew = !product.id
  const id = product.id || uid('p')
  const rec = { ...product, id, updatedAt: now(), ...(isNew ? { createdAt: now() } : {}) }
  let mergedProduct = rec
  let savedVs = []
  let removedVs = []
  let savedMoves = []
  setState((s) => {
    const existing = isNew ? null : s.products.find((p) => p.id === id)
    mergedProduct = existing ? { ...existing, ...rec } : rec
    const products = isNew ? [mergedProduct, ...s.products] : s.products.map((p) => (p.id === id ? mergedProduct : p))
    let next = { ...s, products }
    if (variants) {
      const prev = s.variants.filter((v) => v.productId === id)
      // Existing variants keep their live price, MRP, stock and branch: those change only through
      // updateVariant / adjustStock / transferStock, which record history.
      // A variant with an id that no longer exists was deleted elsewhere (e.g. another tab) after the form
      // opened; it is left out rather than brought back without its price and stock.
      const vs = variants.filter((v) => !v.id || prev.some((o) => o.id === v.id)).map((v) => {
        const live = v.id && prev.find((o) => o.id === v.id)
        const keep = live ? { price: live.price, mrp: live.mrp, stock: live.stock, branchId: live.branchId } : {}
        return { status: 'Active', alertStock: 10, unitType: rec.unitType, ...v, ...keep, id: v.id || uid('v'), productId: id }
      })
      const moves = []
      vs.forEach((v) => {
        const old = prev.find((o) => o.id === v.id)
        if (!old && v.stock > 0) moves.push({ id: uid('sm'), variantId: v.id, productId: id, branchId: v.branchId, type: 'Stock In', qty: v.stock, balance: v.stock, reference: 'Initial stock', notes: `Initial stock for ${rec.name} ${v.size}`, user: actor, date: now() })
      })
      savedVs = vs
      removedVs = prev.filter((o) => !vs.some((n) => n.id === o.id))
      savedMoves = moves
      next = { ...next, variants: [...s.variants.filter((v) => v.productId !== id), ...vs], stockMovements: [...moves, ...s.stockMovements] }
    }
    return next
  })

  // Firestore sync (ordered per doc via enqueueDocWrite — deletes removed variants too!)
  saveDocument('products', mergedProduct.id, mergedProduct, { merge: false }).catch((e) => console.warn('Firestore saveProduct error:', e))
  savedVs.forEach((v) => saveDocument('variants', v.id, v, { merge: false }).catch(console.warn))
  removedVs.forEach((v) => deleteDocument('variants', v.id).catch(console.warn))
  savedMoves.forEach((m) => saveDocument('stockMovements', m.id, m, { merge: false }).catch(console.warn))

  logActivity('product', `${isNew ? 'Product added' : 'Product updated'}: ${mergedProduct.name}`)
  return mergedProduct
}
export function deleteProduct(id) {
  const p = state.products.find((x) => x.id === id)
  const variantsToDelete = state.variants.filter((v) => v.productId === id)
  setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== id), variants: s.variants.filter((v) => v.productId !== id) }))

  const ops = [
    { type: 'delete', col: 'products', id },
    ...variantsToDelete.map((v) => ({ type: 'delete', col: 'variants', id: v.id })),
  ]
  batchFirestore(ops).catch(console.warn)

  if (p) logActivity('product', `Product deleted: ${p.name}`)
}

// ---------------------------------------------------------------------------
// Pricing — every change is recorded in priceHistory.
// ---------------------------------------------------------------------------
/** patch may include price, mrp, stock, status, size, unitType, alertStock */
export function updateVariant(variantId, patch, note = '') {
  const v = state.variants.find((x) => x.id === variantId)
  if (!v) return
  const priceChanged = (patch.price != null && Number(patch.price) !== v.price) || (patch.mrp != null && Number(patch.mrp) !== v.mrp)
  const stockChanged = patch.stock != null && Number(patch.stock) !== v.stock
  let next = null
  let ph = []
  let sm = []
  setState((s) => {
    next = { ...v, ...patch, price: Number(patch.price ?? v.price), mrp: Number(patch.mrp ?? v.mrp), stock: Number(patch.stock ?? v.stock) }
    ph = priceChanged ? [{ id: uid('ph'), variantId, productId: v.productId, branchId: v.branchId, size: next.size, oldPrice: v.price, newPrice: next.price, oldMrp: v.mrp, newMrp: next.mrp, note, user: actor, date: now() }] : []
    sm = stockChanged ? [{ id: uid('sm'), variantId, productId: v.productId, branchId: v.branchId, type: 'Adjustment', qty: next.stock - v.stock, balance: next.stock, reference: 'Price Management', notes: note || 'Stock edited from price management', user: actor, date: now() }] : []
    return { ...s, variants: s.variants.map((x) => (x.id === variantId ? next : x)), priceHistory: [...ph, ...s.priceHistory], stockMovements: [...sm, ...s.stockMovements] }
  })

  if (next) saveDocument('variants', variantId, next).catch(console.warn)
  ph.forEach((item) => saveDocument('priceHistory', item.id, item).catch(console.warn))
  sm.forEach((item) => saveDocument('stockMovements', item.id, item).catch(console.warn))

  if (priceChanged) {
    const p = state.products.find((x) => x.id === v.productId)
    logActivity('price', `Price updated: ${p?.name} ${v.size} ₹${v.price} → ₹${patch.price ?? v.price}`)
  }
}
export function addVariant(data) {
  const v = { id: uid('v'), status: 'Active', alertStock: 10, ...data, price: Number(data.price), mrp: Number(data.mrp), stock: Number(data.stock || 0) }
  const ph = { id: uid('ph'), variantId: v.id, productId: v.productId, branchId: v.branchId, size: v.size, oldPrice: null, newPrice: v.price, oldMrp: null, newMrp: v.mrp, note: 'Variant created', user: actor, date: now() }
  const sm = v.stock ? { id: uid('sm'), variantId: v.id, productId: v.productId, branchId: v.branchId, type: 'Stock In', qty: v.stock, balance: v.stock, reference: 'New variant', notes: '', user: actor, date: now() } : null
  setState((s) => ({
    ...s,
    variants: [...s.variants, v],
    priceHistory: [ph, ...s.priceHistory],
    stockMovements: sm ? [sm, ...s.stockMovements] : s.stockMovements,
  }))
  saveDocument('variants', v.id, v).catch(console.warn)
  saveDocument('priceHistory', ph.id, ph).catch(console.warn)
  if (sm) saveDocument('stockMovements', sm.id, sm).catch(console.warn)
  return v
}
export function removeVariant(variantId) {
  setState((s) => ({ ...s, variants: s.variants.filter((v) => v.id !== variantId) }))
  deleteDocument('variants', variantId).catch(console.warn)
}

// ---------------------------------------------------------------------------
// Inventory — adjustStock / transferStock keep variant.stock and stockMovements in sync.
// type: 'Stock In' | 'Purchase Entry' | 'Return' (add) ; 'Stock Out' | 'Damaged' (remove) ;
//       'Adjustment' (qty is the NEW absolute stock level)
// ---------------------------------------------------------------------------
export function adjustStock({ variantId, type, qty, reference = '', notes = '', date }) {
  const v = state.variants.find((x) => x.id === variantId)
  if (!v) throw new Error('Variant not found')
  qty = Number(qty)
  let delta
  if (type === 'Adjustment') delta = qty - v.stock
  else if (['Stock Out', 'Damaged', 'Order'].includes(type)) delta = -Math.abs(qty)
  else delta = Math.abs(qty)
  const balance = v.stock + delta
  if (balance < 0) throw new Error(`Only ${v.stock} in stock — cannot remove ${Math.abs(delta)}.`)
  const smId = uid('sm')
  const sm = { id: smId, variantId, productId: v.productId, branchId: v.branchId, type, qty: delta, balance, reference, notes, user: actor, date: date ? new Date(date).toISOString() : now() }
  setState((s) => ({
    ...s,
    variants: s.variants.map((x) => (x.id === variantId ? { ...x, stock: balance } : x)),
    stockMovements: [sm, ...s.stockMovements],
  }))
  saveDocument('variants', variantId, { ...v, stock: balance }).catch(console.warn)
  saveDocument('stockMovements', smId, sm).catch(console.warn)
  const p = state.products.find((x) => x.id === v.productId)
  logActivity('stock', `${type}: ${delta > 0 ? '+' : ''}${delta} × ${p?.name} ${v.size}`)
  return balance
}
/** Moves stock of a product size between branches. Creates the target variant (copying price) if missing. */
export function transferStock({ fromBranchId, toBranchId, variantId, qty, date, notes = '' }) {
  qty = Math.abs(Number(qty))
  const src = state.variants.find((x) => x.id === variantId)
  if (!src || src.branchId !== fromBranchId) throw new Error('Select a product available in the source branch.')
  if (fromBranchId === toBranchId) throw new Error('Source and destination branches must be different.')
  if (qty <= 0) throw new Error('Quantity must be at least 1.')
  if (qty > src.stock) throw new Error(`Only ${src.stock} available in the source branch.`)
  let dst = state.variants.find((x) => x.productId === src.productId && x.branchId === toBranchId && normSize(x.size) === normSize(src.size))
  const ref = `TRF-${String(state.stockMovements.filter((m) => m.type === 'Transfer Out').length + 8).padStart(4, '0')}`
  const at = date ? new Date(date).toISOString() : now()
  const fromName = state.branches.find((b) => b.id === fromBranchId)?.name
  const toName = state.branches.find((b) => b.id === toBranchId)?.name
  let outSm = null
  let inSm = null
  setState((s) => {
    let vs = s.variants.map((x) => (x.id === src.id ? { ...x, stock: x.stock - qty } : x))
    if (dst) vs = vs.map((x) => (x.id === dst.id ? { ...x, stock: x.stock + qty } : x))
    else {
      // A new variant at the destination gets the normal per-branch SKU (PRODUCT-BRANCH-SIZE), like any other.
      const product = s.products.find((p) => p.id === src.productId)
      const branch = s.branches.find((b) => b.id === toBranchId)
      dst = { ...src, id: uid('v'), branchId: toBranchId, stock: qty, sku: variantSku(product?.sku || src.sku, branch, src.size) }
      vs = [...vs, dst]
    }
    const dstBal = vs.find((x) => x.id === dst.id).stock
    inSm = { id: uid('sm'), variantId: dst.id, productId: src.productId, branchId: toBranchId, type: 'Transfer In', qty, balance: dstBal, reference: ref, notes: notes || `From ${fromName}`, user: actor, date: at }
    outSm = { id: uid('sm'), variantId: src.id, productId: src.productId, branchId: fromBranchId, type: 'Transfer Out', qty: -qty, balance: src.stock - qty, reference: ref, notes: notes || `To ${toName}`, user: actor, date: at }
    return {
      ...s, variants: vs,
      stockMovements: [inSm, outSm, ...s.stockMovements],
    }
  })
  saveDocument('variants', src.id, { ...src, stock: src.stock - qty }).catch(console.warn)
  if (dst) saveDocument('variants', dst.id, dst).catch(console.warn)
  if (inSm) saveDocument('stockMovements', inSm.id, inSm).catch(console.warn)
  if (outSm) saveDocument('stockMovements', outSm.id, outSm).catch(console.warn)
  const p = state.products.find((x) => x.id === src.productId)
  logActivity('stock', `Stock transfer ${ref}: ${qty} × ${p?.name} ${src.size} from ${fromName} to ${toName}`)
  return ref
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
const RESTOCK = ['Cancelled', 'Returned']
const FULFIL = ['Processing', 'Shipped', 'Delivered']
/** True when moving to `status` will take the order's items out of stock (order confirmed). */
export const willDeduct = (o, status) => FULFIL.includes(status) && !o.stockDeducted && !RESTOCK.includes(o.status)
/** True when moving to `status` will put the order's items back into stock. */
export const willRestock = (o, status) => RESTOCK.includes(status) && !!o.stockDeducted
/** An online order whose payment hasn't been received: it can be cancelled but not confirmed or shipped. */
export const awaitingPayment = (o) => o.paymentMethod !== 'Cash on Delivery' && ['Pending', 'Failed'].includes(o.paymentStatus)
/**
 * Changes order status and appends to the timeline.
 * Stock: items are deducted when an order is first confirmed (Pending → Processing/Shipped/Delivered)
 * and added back on Cancelled/Returned if they had been deducted. Throws if stock is insufficient, or if an
 * online order that hasn't been paid would be confirmed. Confirming also issues the order's invoice.
 * Returns { deducted, lowStock } or { restocked, restockedItems, skippedItems }.
 */
export function updateOrderStatus(orderId, status, note = '', extra = {}) {
  const o = state.orders.find((x) => x.id === orderId)
  if (!o || o.status === status) return
  if (FULFIL.includes(status) && awaitingPayment(o)) {
    throw new Error(`${o.number} can't be ${status.toLowerCase()} — its online payment is ${o.paymentStatus.toLowerCase()}. Wait for the payment, or cancel the order.`)
  }
  const deduct = willDeduct(o, status)
  const restock = willRestock(o, status)
  if (deduct) {
    const short = o.items.filter((it) => { const v = state.variants.find((x) => x.id === it.variantId); return !v || v.stock < it.qty })
    if (short.length) throw new Error(`Not enough stock for ${short.map((it) => `${it.name} ${it.size}`).join(', ')}. Add stock in Inventory first.`)
  }
  let restockedItems = 0
  let skippedItems = 0
  let savedMoves = []
  let savedVariants = []
  setState((s) => {
    let variants = s.variants
    const moves = []
    restockedItems = 0
    skippedItems = 0
    if (deduct || restock) {
      const touchedIds = new Set()
      o.items.forEach((it) => {
        const v = variants.find((x) => x.id === it.variantId)
        if (!v) { if (restock) skippedItems += 1; return } // the variant was deleted since the order
        if (restock) restockedItems += 1
        const delta = deduct ? -it.qty : it.qty
        variants = variants.map((x) => (x.id === v.id ? { ...x, stock: x.stock + delta } : x))
        touchedIds.add(v.id)
        moves.push({ id: uid('sm'), variantId: v.id, productId: v.productId, branchId: v.branchId, type: deduct ? 'Order' : 'Return', qty: delta, balance: v.stock + delta, reference: o.number, notes: deduct ? 'Stock out — order confirmed' : `Restocked — order ${status.toLowerCase()}`, user: actor, date: now() })
      })
      savedMoves = moves
      savedVariants = variants.filter((v) => touchedIds.has(v.id))
    }
    let paymentStatus = o.paymentStatus
    if (status === 'Delivered' && o.paymentMethod === 'Cash on Delivery') paymentStatus = 'Paid'
    const stockDeducted = deduct ? true : restock ? false : !!o.stockDeducted
    const at = now()
    const invoice = o.invoice || (deduct ? issueInvoice(o, s.settings, at) : undefined)
    return {
      ...s, variants,
      stockMovements: [...moves, ...s.stockMovements],
      orders: s.orders.map((x) => (x.id === orderId ? { ...x, ...extra, status, paymentStatus, stockDeducted, ...(invoice ? { invoice } : {}), updatedAt: at, timeline: [...x.timeline, { status, note, at, by: actor }] } : x)),
    }
  })

  // Sync with Firestore
  const updatedOrder = getState().orders.find((x) => x.id === orderId)
  if (updatedOrder) saveDocument('orders', orderId, updatedOrder).catch(console.warn)
  if (savedMoves.length) savedMoves.forEach((m) => saveDocument('stockMovements', m.id, m).catch(console.warn))
  if (savedVariants.length) savedVariants.forEach((v) => saveDocument('variants', v.id, v).catch(console.warn))
  const restockText = !restock ? '' : skippedItems
    ? ` (${restockedItems} item${restockedItems === 1 ? '' : 's'} restocked; ${skippedItems} skipped — variant no longer exists)`
    : ' (items restocked)'
  logActivity('order', `Order ${o.number} marked ${status}${deduct ? ' (stock deducted)' : restockText}`)
  if (deduct) {
    const low = o.items.map((it) => getState().variants.find((x) => x.id === it.variantId)).filter((v) => v && v.stock <= v.alertStock)
    return { deducted: true, lowStock: low }
  }
  return { restocked: restockedItems > 0, restockedItems, skippedItems }
}
export function updateOrder(orderId, patch) { updateItem('orders', orderId, patch) }

// ---------------------------------------------------------------------------
// Notifications (derived from data; read-state persisted)
// ---------------------------------------------------------------------------
export function markNotificationsRead(ids) {
  setState((s) => ({ ...s, readNotifications: [...new Set([...(s.readNotifications || []), ...ids])].slice(-500) }))
}

export function resetDemoData() {
  state = buildSeed()
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

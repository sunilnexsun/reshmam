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
}

const LISTS = ['branches', 'products', 'variants', 'customers', 'orders', 'stockMovements', 'priceHistory', 'coupons', 'campaigns', 'banners', 'activities']
const OBJECTS = ['whatsapp', 'chatbot', 'settings']
/** True when `data` has every collection the screens read, so a damaged snapshot isn't adopted. */
const hasDbShape = (data) =>
  LISTS.every((k) => Array.isArray(data?.[k])) && OBJECTS.every((k) => data?.[k] && typeof data[k] === 'object')

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
// Generic collection helpers. `col` is a top-level array key, e.g. 'customers'.
// For nested arrays use a path: 'whatsapp.templates', 'chatbot.flows', 'settings.users'.
// ---------------------------------------------------------------------------
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
function setPath(obj, path, value) {
  const [k, ...rest] = path.split('.')
  return { ...obj, [k]: rest.length ? setPath(obj[k] ?? {}, rest.join('.'), value) : value }
}

export function createItem(col, data, prefix = col.split('.').pop().slice(0, 3)) {
  const item = { id: uid(prefix), createdAt: now(), ...data }
  setState((s) => setPath(s, col, [item, ...(getPath(s, col) || [])]))
  return item
}
export function updateItem(col, id, patch) {
  setState((s) => setPath(s, col, (getPath(s, col) || []).map((x) => (x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch), updatedAt: now() } : x))))
}
export function removeItem(col, id) {
  setState((s) => setPath(s, col, (getPath(s, col) || []).filter((x) => x.id !== id)))
}
/** Shallow-merge into an object section, e.g. updateSection('settings.tax', { defaultGst: 12 }) */
export function updateSection(path, patch) {
  setState((s) => setPath(s, path, { ...(getPath(s, path) || {}), ...patch }))
}

export function logActivity(type, message) {
  setState((s) => ({ ...s, activities: [{ id: uid('ac'), type, message, user: actor, at: now() }, ...s.activities].slice(0, 300) }))
}

// ---------------------------------------------------------------------------
// Products & variants
// ---------------------------------------------------------------------------
/** Create or update a product. `variants` (optional) replaces the product's variant list. */
export function saveProduct(product, variants) {
  const isNew = !product.id
  const id = product.id || uid('p')
  const rec = { ...product, id, updatedAt: now(), ...(isNew ? { createdAt: now() } : {}) }
  setState((s) => {
    const products = isNew ? [rec, ...s.products] : s.products.map((p) => (p.id === id ? { ...p, ...rec } : p))
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
      next = { ...next, variants: [...s.variants.filter((v) => v.productId !== id), ...vs], stockMovements: [...moves, ...s.stockMovements] }
    }
    return next
  })
  logActivity('product', `${isNew ? 'Product added' : 'Product updated'}: ${rec.name}`)
  return rec
}
export function deleteProduct(id) {
  const p = state.products.find((x) => x.id === id)
  setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== id), variants: s.variants.filter((v) => v.productId !== id) }))
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
  setState((s) => {
    const next = { ...v, ...patch, price: Number(patch.price ?? v.price), mrp: Number(patch.mrp ?? v.mrp), stock: Number(patch.stock ?? v.stock) }
    const ph = priceChanged ? [{ id: uid('ph'), variantId, productId: v.productId, branchId: v.branchId, size: next.size, oldPrice: v.price, newPrice: next.price, oldMrp: v.mrp, newMrp: next.mrp, note, user: actor, date: now() }] : []
    const sm = stockChanged ? [{ id: uid('sm'), variantId, productId: v.productId, branchId: v.branchId, type: 'Adjustment', qty: next.stock - v.stock, balance: next.stock, reference: 'Price Management', notes: note || 'Stock edited from price management', user: actor, date: now() }] : []
    return { ...s, variants: s.variants.map((x) => (x.id === variantId ? next : x)), priceHistory: [...ph, ...s.priceHistory], stockMovements: [...sm, ...s.stockMovements] }
  })
  if (priceChanged) {
    const p = state.products.find((x) => x.id === v.productId)
    logActivity('price', `Price updated: ${p?.name} ${v.size} ₹${v.price} → ₹${patch.price ?? v.price}`)
  }
}
export function addVariant(data) {
  const v = { id: uid('v'), status: 'Active', alertStock: 10, ...data, price: Number(data.price), mrp: Number(data.mrp), stock: Number(data.stock || 0) }
  setState((s) => ({
    ...s,
    variants: [...s.variants, v],
    priceHistory: [{ id: uid('ph'), variantId: v.id, productId: v.productId, branchId: v.branchId, size: v.size, oldPrice: null, newPrice: v.price, oldMrp: null, newMrp: v.mrp, note: 'Variant created', user: actor, date: now() }, ...s.priceHistory],
    stockMovements: v.stock ? [{ id: uid('sm'), variantId: v.id, productId: v.productId, branchId: v.branchId, type: 'Stock In', qty: v.stock, balance: v.stock, reference: 'New variant', notes: '', user: actor, date: now() }, ...s.stockMovements] : s.stockMovements,
  }))
  return v
}
export function removeVariant(variantId) {
  setState((s) => ({ ...s, variants: s.variants.filter((v) => v.id !== variantId) }))
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
  setState((s) => ({
    ...s,
    variants: s.variants.map((x) => (x.id === variantId ? { ...x, stock: balance } : x)),
    stockMovements: [{ id: uid('sm'), variantId, productId: v.productId, branchId: v.branchId, type, qty: delta, balance, reference, notes, user: actor, date: date ? new Date(date).toISOString() : now() }, ...s.stockMovements],
  }))
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
    return {
      ...s, variants: vs,
      stockMovements: [
        { id: uid('sm'), variantId: dst.id, productId: src.productId, branchId: toBranchId, type: 'Transfer In', qty, balance: dstBal, reference: ref, notes: notes || `From ${fromName}`, user: actor, date: at },
        { id: uid('sm'), variantId: src.id, productId: src.productId, branchId: fromBranchId, type: 'Transfer Out', qty: -qty, balance: src.stock - qty, reference: ref, notes: notes || `To ${toName}`, user: actor, date: at },
        ...s.stockMovements,
      ],
    }
  })
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
  setState((s) => {
    let variants = s.variants
    const moves = []
    restockedItems = 0
    skippedItems = 0
    if (deduct || restock) {
      o.items.forEach((it) => {
        const v = variants.find((x) => x.id === it.variantId)
        if (!v) { if (restock) skippedItems += 1; return } // the variant was deleted since the order
        if (restock) restockedItems += 1
        const delta = deduct ? -it.qty : it.qty
        variants = variants.map((x) => (x.id === v.id ? { ...x, stock: x.stock + delta } : x))
        moves.push({ id: uid('sm'), variantId: v.id, productId: v.productId, branchId: v.branchId, type: deduct ? 'Order' : 'Return', qty: delta, balance: v.stock + delta, reference: o.number, notes: deduct ? 'Stock out — order confirmed' : `Restocked — order ${status.toLowerCase()}`, user: actor, date: now() })
      })
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

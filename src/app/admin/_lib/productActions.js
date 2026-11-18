// Products & Price Management module — extra domain actions built on the core store.
// Backend phase: swap the bodies for batch API calls (e.g. PATCH /products/bulk, POST /prices/bulk).
import { getState, setState, logActivity, updateVariant } from './store'
import { saveDocument, batchFirestore } from './firebase'

const now = () => new Date().toISOString()

/** Activate / deactivate several products at once. */
export function setProductsStatus(ids, status) {
  const set = new Set(ids)
  const names = getState().products.filter((p) => set.has(p.id)).map((p) => p.name)
  setState((s) => ({ ...s, products: s.products.map((p) => (set.has(p.id) ? { ...p, status, updatedAt: now() } : p)) }))
  ids.forEach((id) => saveDocument('products', id, { status }).catch(console.warn))
  if (names.length === 1) logActivity('product', `Product ${status === 'Active' ? 'activated' : 'deactivated'}: ${names[0]}`)
  else if (names.length) logActivity('product', `${names.length} products marked ${status}`)
  return names.length
}

/** Toggle the featured flag of one product. */
export function setProductFeatured(id, featured) {
  setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, featured, updatedAt: now() } : p)) }))
  saveDocument('products', id, { featured }).catch(console.warn)
}

/** Deletes several products and their variants (stock & price history are kept for audit). */
export function deleteProducts(ids) {
  const set = new Set(ids)
  const names = getState().products.filter((p) => set.has(p.id)).map((p) => p.name)
  const variantsToDelete = getState().variants.filter((v) => set.has(v.productId))
  setState((s) => ({ ...s, products: s.products.filter((p) => !set.has(p.id)), variants: s.variants.filter((v) => !set.has(v.productId)) }))
  const ops = [
    ...ids.map((id) => ({ type: 'delete', col: 'products', id })),
    ...variantsToDelete.map((v) => ({ type: 'delete', col: 'variants', id: v.id })),
  ]
  batchFirestore(ops).catch(console.warn)
  if (names.length) logActivity('product', names.length === 1 ? `Product deleted: ${names[0]}` : `${names.length} products deleted`)
  return names.length
}

/**
 * Applies several variant edits with one shared note. Each change goes through updateVariant,
 * so price changes land in priceHistory and stock edits in stockMovements.
 * changes: [{ id, patch }]
 */
export function applyVariantChanges(changes, note = '') {
  changes.forEach(({ id, patch }) => updateVariant(id, patch, note))
  return changes.length
}

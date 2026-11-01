import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { orderGst } from '@admin/_lib/gst'
import { buildSeed, SEED_VERSION } from '@admin/_lib/seed'
import { getState, migrate, saveProduct, setState } from '@admin/_lib/store'

// In Node there is no localStorage, so the store starts from the seed data.
const seed = buildSeed()
beforeEach(() => setState(buildSeed()))

describe('saveProduct', () => {
  const formRows = (variants) => variants.map((v) => ({
    id: v.id, branchId: v.branchId, size: v.size, unitType: v.unitType, alertStock: v.alertStock, status: v.status, sku: v.sku,
  }))

  it('keeps live stock, price and branch when a stale form is saved', () => {
    const p = getState().products[0]
    const snapshot = getState().variants.filter((v) => v.productId === p.id).map((v) => ({ ...v }))
    const target = snapshot[0]
    // Meanwhile an order takes stock and a price changes elsewhere.
    setState((s) => ({ ...s, variants: s.variants.map((v) => (v.id === target.id ? { ...v, stock: v.stock - 3, price: v.price + 7 } : v)) }))
    // The stale form even tries to send old stock/price and a different branch.
    saveProduct({ ...p, name: `${p.name} (edited)` }, snapshot.map((v) => ({ ...v, branchId: 'br_cf' })))
    const after = getState().variants.find((v) => v.id === target.id)
    expect(after.stock).toBe(target.stock - 3)
    expect(after.price).toBe(target.price + 7)
    expect(after.branchId).toBe(target.branchId)
    expect(getState().products.find((x) => x.id === p.id).name).toBe(`${p.name} (edited)`)
  })

  it('does not bring back a variant deleted elsewhere', () => {
    const p = getState().products[1]
    const vs = getState().variants.filter((v) => v.productId === p.id)
    setState((s) => ({ ...s, variants: s.variants.filter((v) => v.id !== vs[0].id) }))
    saveProduct({ ...p }, formRows(vs))
    const now = getState().variants.filter((v) => v.productId === p.id)
    expect(now.map((v) => v.id)).not.toContain(vs[0].id)
    expect(now).toHaveLength(vs.length - 1)
  })

  it('adds a new variant with its initial stock and a stock-in movement', () => {
    const p = getState().products[0]
    const existing = getState().variants.filter((v) => v.productId === p.id)
    saveProduct({ ...p }, [...formRows(existing), { branchId: existing[0].branchId, size: '9 L', unitType: 'Can', alertStock: 2, status: 'Active', sku: 'NEW-9L', price: 900, mrp: 1000, stock: 12 }])
    const added = getState().variants.find((v) => v.sku === 'NEW-9L')
    expect(added).toMatchObject({ stock: 12, price: 900, productId: p.id })
    expect(getState().stockMovements.find((m) => m.variantId === added.id)).toMatchObject({ type: 'Stock In', qty: 12 })
  })
})

describe('saving', () => {
  afterEach(() => vi.useRealTimers())
  it('writes changes to storage shortly after they are made', () => {
    vi.useFakeTimers()
    localStorage.clear()
    setState((s) => ({ ...s, products: [{ ...s.products[0], name: 'SAVED' }, ...s.products.slice(1)] }))
    vi.advanceTimersByTime(200) // the store saves 120 ms after a change
    const saved = JSON.parse(localStorage.getItem('reshmam-admin-v1'))
    expect(saved.products[0].name).toBe('SAVED')
    expect(saved.meta.version).toBe(SEED_VERSION)
  })
})

describe('migrate (saved data upgrades)', () => {
  it('passes current data through unchanged', () => {
    expect(migrate(seed)).toBe(seed)
  })

  it('upgrades version 2 data and recomputes order tax after discount', () => {
    const v2 = { ...seed, meta: { ...seed.meta, version: 2 }, products: [{ ...seed.products[0], name: 'KEEP-ME' }, ...seed.products.slice(1)], orders: seed.orders.map((o) => ({ ...o, tax: 999999 })) }
    const up = migrate(v2)
    expect(up.meta.version).toBe(SEED_VERSION)
    expect(up.products[0].name).toBe('KEEP-ME')
    expect(up.orders.every((o) => o.tax === orderGst(o))).toBe(true)
  })

  it.each([
    ['newer than this code', { ...seed, meta: { version: 99 } }],
    ['without a version', { ...seed, meta: {} }],
    ['missing collections', { meta: { version: SEED_VERSION } }],
    ['with a damaged collection', { ...seed, orders: 'not a list' }],
  ])('refuses data %s', (_label, data) => {
    expect(migrate(data)).toBeNull()
  })
})

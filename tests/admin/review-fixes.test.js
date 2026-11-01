import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withIssuedInvoices } from '@admin/_lib/invoice'
import { buildSeed } from '@admin/_lib/seed'
import { notifications, visibleActivities } from '@admin/_lib/selectors'
import { getState, isSaveFailing, migrate, setState, transferStock, updateOrderStatus, updateSection } from '@admin/_lib/store'
import { allowedNext, gstBreakdown } from '@admin/orders/orderUtils'
import { variantPatch, withEdit } from '@admin/price-management/priceDrafts'

beforeEach(() => setState(buildSeed()))
const order = (pred) => getState().orders.find(pred)
const patchOrder = (id, patch) => setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))

describe('A1: storage full', () => {
  afterEach(() => vi.useRealTimers())
  it('reports a failed save and clears it once saving works again', () => {
    vi.useFakeTimers()
    const real = localStorage.setItem
    localStorage.setItem = () => { throw new Error('QuotaExceededError') }
    setState((s) => ({ ...s }))
    vi.advanceTimersByTime(200) // the store saves 120 ms after a change
    expect(isSaveFailing()).toBe(true)
    localStorage.setItem = real
    setState((s) => ({ ...s }))
    vi.advanceTimersByTime(200) // the store saves 120 ms after a change
    expect(isSaveFailing()).toBe(false)
  })
})

describe('A2: Price Management drafts', () => {
  const live = { price: 100, mrp: 120, stock: 45, status: 'Active' }
  it('saves only the fields the user edited', () => {
    // The page opened at stock 50; an order then took 5 (live = 45); the user changed only the price.
    const draft = withEdit(undefined, 'price', '110')
    expect(variantPatch(draft, live)).toEqual({ price: 110 })
  })
  it('ignores edits that match the live value, and converts numbers', () => {
    expect(variantPatch({ price: '100', stock: '40', status: 'Inactive' }, live)).toEqual({ stock: 40, status: 'Inactive' })
    expect(variantPatch(undefined, live)).toEqual({})
  })
})

describe('A3: visibility by permission', () => {
  const only = (...modules) => (m) => modules.includes(m)
  it('shows notifications only for modules the role can view', () => {
    const db = getState()
    const all = notifications(db)
    expect(all.some((n) => n.title === 'New order')).toBe(true)
    const staff = notifications(db, only('inventory'))
    expect(staff.every((n) => ['Low stock', 'Out of stock'].includes(n.title))).toBe(true)
    expect(notifications(db, only())).toEqual([])
  })
  it('filters the activity feed by module', () => {
    const acts = [{ type: 'order' }, { type: 'settings' }, { type: 'stock' }, { type: 'unknown' }]
    expect(visibleActivities(acts, only('orders', 'inventory')).map((a) => a.type)).toEqual(['order', 'stock'])
  })
})

describe('A4: invoices are issued at confirmation and kept', () => {
  it('issues the invoice when an order is confirmed, not before', () => {
    const o = order((x) => x.status === 'Pending' && x.paymentStatus === 'Paid')
    expect(o.invoice).toBeUndefined()
    updateOrderStatus(o.id, 'Processing', 'ok')
    const inv = order((x) => x.id === o.id).invoice
    expect(inv.number).toBe(`INV-${o.number.replace(/^[A-Za-z]+-?/, '')}`)
    expect(inv.company.legalName).toBe(getState().settings.company.legalName)
    expect(inv.company.logo).toBeUndefined()
  })
  it('keeps the number, date and seller details after settings change', () => {
    const o = order((x) => x.invoice)
    const before = structuredClone(o.invoice)
    updateSection('settings.tax', { invoicePrefix: 'NEW-', placeOfSupply: 'Kerala' })
    updateSection('settings.company', { legalName: 'Someone Else' })
    updateOrderStatus(o.id, o.status === 'Shipped' ? 'Delivered' : 'Returned', 'later')
    expect(order((x) => x.id === o.id).invoice).toEqual(before)
  })
  it('sample data and upgraded data carry invoices for confirmed orders only', () => {
    const db = getState()
    expect(db.orders.filter((o) => o.stockDeducted).every((o) => o.invoice)).toBe(true)
    expect(db.orders.filter((o) => o.status === 'Pending').every((o) => !o.invoice)).toBe(true)
    const v3 = { ...db, meta: { ...db.meta, version: 3 }, orders: db.orders.map((o) => ({ ...o, invoice: undefined })) }
    const up = migrate(v3)
    expect(up.orders.filter((o) => o.stockDeducted).every((o) => o.invoice?.number)).toBe(true)
    // Returned orders were confirmed before being returned, so they have an invoice too.
    expect(up.orders.filter((o) => o.status === 'Returned').every((o) => o.invoice)).toBe(true)
  })
  it('withIssuedInvoices dates an invoice when the order was first confirmed', () => {
    const db = { settings: getState().settings, orders: [{ id: 'o', number: 'RSH-1', stockDeducted: true, createdAt: '2026-01-01T00:00:00Z', timeline: [{ status: 'Pending', at: '2026-01-01T00:00:00Z' }, { status: 'Processing', at: '2026-01-02T00:00:00Z' }] }] }
    expect(withIssuedInvoices(db).orders[0].invoice.date).toBe('2026-01-02T00:00:00Z')
  })
})

describe('A5: "Charge GST" switch', () => {
  const o = { subtotal: 1000, discount: 0, items: [{ total: 1000, gst: 5 }], shippingAddress: { state: 'Tamil Nadu' } }
  it('shows GST when on, nothing when off', () => {
    expect(gstBreakdown(o, { tax: { gstEnabled: true } }).totalTax).toBeGreaterThan(0)
    expect(gstBreakdown(o, { tax: { gstEnabled: false } })).toMatchObject({ rows: [], totalTax: 0, gstEnabled: false })
  })
})

describe('A6: unpaid online orders', () => {
  it('can only be cancelled, and confirming them is refused', () => {
    const o = order((x) => x.status === 'Pending' && x.paymentMethod !== 'Cash on Delivery')
    patchOrder(o.id, { paymentStatus: 'Failed' })
    const failed = order((x) => x.id === o.id)
    expect(allowedNext(failed)).toEqual(['Cancelled'])
    expect(() => updateOrderStatus(o.id, 'Processing')).toThrow(/payment is failed/)
    expect(order((x) => x.id === o.id).stockDeducted).toBeFalsy()
  })
  it('cash on delivery orders can still be confirmed before payment', () => {
    const o = order((x) => x.status === 'Pending' && x.paymentMethod === 'Cash on Delivery')
    expect(allowedNext(o)).toContain('Processing')
  })
})

describe('A9: restock reporting', () => {
  it('counts restocked and skipped items when a variant no longer exists', () => {
    const o = order((x) => x.status === 'Processing' && x.items.length >= 1)
    const gone = o.items[0].variantId
    setState((s) => ({ ...s, variants: s.variants.filter((v) => v.id !== gone) }))
    const res = updateOrderStatus(o.id, 'Cancelled', 'test')
    const skipped = o.items.filter((it) => it.variantId === gone).length
    expect(res).toMatchObject({ skippedItems: skipped, restockedItems: o.items.length - skipped })
    expect(getState().activities[0].message).toMatch(/skipped/)
  })
})

describe('A10: transfers', () => {
  it('creates the destination variant with the normal per-branch SKU', () => {
    const db = getState()
    const target = db.branches[db.branches.length - 1]
    const src = db.variants.find((v) => v.stock > 1 && v.branchId !== target.id
      && !db.variants.some((x) => x.productId === v.productId && x.branchId === target.id && x.size === v.size))
    transferStock({ fromBranchId: src.branchId, toBranchId: target.id, variantId: src.id, qty: 1 })
    const dst = getState().variants.find((v) => v.productId === src.productId && v.branchId === target.id && v.size === src.size)
    expect(dst.sku).not.toMatch(/-T$/)
    expect(dst.sku).toContain(target.code.replace(/\d+$/, ''))
    expect(getState().variants.filter((v) => v.sku === dst.sku)).toHaveLength(1)
  })
})

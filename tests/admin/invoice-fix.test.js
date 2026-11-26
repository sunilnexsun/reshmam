import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gstByRate, orderGst } from '@admin/_lib/gst'
import { resolveOrderInvoice } from '@admin/_lib/invoice'
import { buildSeed } from '@admin/_lib/seed'
import { getState, setState, updateOrderStatus } from '@admin/_lib/store'
import { addressLines, gstBreakdown, itemLineTotal } from '@admin/orders/orderUtils'
import { parseBlogContent } from '@storefront/_lib/blog'

const baseSettings = () => buildSeed().settings

describe('Storefront order invoice & Print/Download fixes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setState(buildSeed())
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('computes itemLineTotal, addressLines, and GST breakdown for storefront orders missing item.total and address.line1', () => {
    const storefrontOrder = {
      id: 'ord-sf-1',
      order_number: 'RSH-2026-0001',
      status: 'Pending',
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      stockDeducted: true,
      subtotal: 760,
      discount: 0,
      shippingCost: 0,
      total: 760,
      shippingAddress: {
        name: 'Karthik',
        street: '14 Gandhi Road',
        city: 'Erode',
        state: 'Tamil Nadu',
        pincode: '638001',
      },
      items: [
        { name: 'Gingelly Oil', variantLabel: '1 Litre', qty: 2, price: 380, subtotal: 760, gst: 5 },
      ],
      createdAt: '2026-11-25T10:00:00.000Z',
    }

    expect(itemLineTotal(storefrontOrder.items[0])).toBe(760)
    expect(addressLines(storefrontOrder.shippingAddress)).toEqual([
      '14 Gandhi Road',
      'Erode, Tamil Nadu – 638001',
    ])
    const rows = gstByRate(storefrontOrder)
    expect(rows).toHaveLength(1)
    expect(rows[0].gross).toBe(760)
    expect(Number.isFinite(rows[0].tax)).toBe(true)
    expect(orderGst(storefrontOrder)).toBeGreaterThan(0)
    expect(gstBreakdown(storefrontOrder, baseSettings()).rows).toHaveLength(1)
  })

  it('resolves invoices reliably for confirmed orders (even without stored invoice) and marks unconfirmed orders as proforma', () => {
    const settings = baseSettings()

    const pendingOrder = {
      id: 'ord-p-1',
      order_number: 'RSH-2026-0002',
      status: 'Pending',
      paymentStatus: 'Pending',
      stockDeducted: false,
      createdAt: '2026-11-25T10:00:00.000Z',
    }
    const proforma = resolveOrderInvoice(pendingOrder, settings)
    expect(proforma.isProforma).toBe(true)
    expect(proforma.invoice.number).toContain('2026-0002')

    const confirmedWithoutInvoice = {
      id: 'ord-c-1',
      order_number: 'RSH-2026-0003',
      status: 'Processing',
      paymentStatus: 'Paid',
      stockDeducted: true,
      createdAt: '2026-11-25T10:00:00.000Z',
    }
    const taxInv = resolveOrderInvoice(confirmedWithoutInvoice, settings)
    expect(taxInv.isProforma).toBe(false)
    expect(taxInv.invoice.number).toContain('2026-0003')
  })

  it('issues an invoice when transitioning a storefront order with stockDeducted=true to Processing', () => {
    setState((s) => ({
      ...s,
      orders: [
        {
          id: 'ord-sf-2',
          number: 'RSH-99001',
          customerName: 'Anitha',
          status: 'Pending',
          paymentMethod: 'Cash on Delivery',
          paymentStatus: 'Pending',
          stockDeducted: true,
          subtotal: 380,
          discount: 0,
          total: 380,
          items: [{ name: 'Gingelly Oil', variantLabel: '1 L', qty: 1, price: 380, total: 380, gst: 5 }],
          timeline: [{ status: 'Pending', at: '2026-11-25T10:00:00.000Z' }],
          createdAt: '2026-11-25T10:00:00.000Z',
        },
        ...s.orders,
      ],
    }))

    updateOrderStatus('ord-sf-2', 'Processing')
    const updated = getState().orders.find((o) => o.id === 'ord-sf-2')
    expect(updated.status).toBe('Processing')
    expect(updated.invoice).toBeTruthy()
    expect(updated.invoice.number).toBe('INV-99001')
  })
})

describe('Dynamic blog content parsing', () => {
  it('parses headings, paragraphs, and bullet lists from admin content text', () => {
    const sections = parseBlogContent(
      'Intro paragraph about wood-pressed oil.\n\n## Key Benefits\n- Retains natural antioxidants\n- Zero chemical solvents'
    )
    expect(sections).toEqual([
      { paragraphs: ['Intro paragraph about wood-pressed oil.'] },
      {
        heading: 'Key Benefits',
        list: ['Retains natural antioxidants', 'Zero chemical solvents'],
      },
    ])
  })
})

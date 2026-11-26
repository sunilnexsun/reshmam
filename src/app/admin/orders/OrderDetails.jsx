'use client'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from '@admin/_lib/navigation'
import { Ban, Check, CreditCard, FileDown, Mail, MapPin, MessageCircle, Package, Pencil, Phone, Printer, RefreshCw, RotateCcw, Truck, Undo2, User } from 'lucide-react'
import { Avatar, Badge, Button, Card, DemoNote, InfoList, PageHeader, StatusBadge, Textarea, Thumb, useConfirm, useToast } from '@admin/_components/ui'
import { updateOrder, updateOrderStatus, useDb } from '@admin/_lib/store'
import { legacyRefunds, refundedAmount } from '@admin/_lib/orderActions'
import { productImage } from '@admin/_lib/selectors'
import { useAuth } from '@admin/_lib/auth'
import { cn, dateTime, inr } from '@admin/_lib/format'
import NotFound from '@admin/_components/NotFound'
import { addressLines, allowedNext, canRefund, gstBreakdown, isCod, itemLineTotal, willRestock } from './orderUtils'
import { downloadInvoicePdf } from './invoicePdf'
import InvoicePrint from './InvoicePrint'
import UpdateStatusModal from './UpdateStatusModal'
import RefundModal from './RefundModal'

const FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered']
const TL_ICON = { Pending: Package, Processing: RefreshCw, Shipped: Truck, Delivered: Check, Cancelled: Ban, Returned: RotateCcw }
const TL_TONE = { Pending: 'bg-amber-100 text-amber-700', Processing: 'bg-blue-100 text-blue-700', Shipped: 'bg-violet-100 text-violet-700', Delivered: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700', Returned: 'bg-teal-100 text-teal-700' }
const REFUND_TONE = { 'Pending gateway': 'amber', Processed: 'green', Manual: 'blue' }

export default function OrderDetails() {
  const { id } = useParams()
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useAuth()
  const canManage = can('orders', 'manage')
  const [params, setParams] = useSearchParams()
  const order = db.orders.find((o) => o.id === id)
  const [statusOpen, setStatusOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [notes, setNotes] = useState(null)

  // /orders/:id?print=1 (from the list's Print action) opens the print dialog once the page renders.
  const autoPrint = params.get('print') === '1'
  useEffect(() => {
    if (!autoPrint || !order) return
    setParams((p) => { p.delete('print'); return p }, { replace: true })
    const t = setTimeout(() => window.print(), 350)
    return () => clearTimeout(t)
  }, [autoPrint, order, setParams])

  const customer = useMemo(() => db.customers.find((c) => c.id === order?.customerId), [db.customers, order?.customerId])
  if (!order) return <NotFound title="Order not found" text="This order does not exist or was removed." back="/orders" backLabel="Back to Orders" />

  const branch = db.branches.find((b) => b.id === order.branchId)
  const next = allowedNext(order)
  const refunds = legacyRefunds(order)
  const refunded = refundedAmount(order)
  // The issued invoice's tax settings once confirmed; the current settings before that.
  const g = gstBreakdown(order, order.invoice || db.settings)
  const cod = isCod(order)
  const phoneDigits = (order.customerPhone || '').replace(/\D/g, '')
  const stepIndex = FLOW.indexOf(order.status)
  const offFlow = !FLOW.includes(order.status)
  const lastFlow = offFlow ? Math.max(0, ...order.timeline.map((t) => FLOW.indexOf(t.status))) : stepIndex

  const onCancel = async () => {
    const restock = willRestock(order, 'Cancelled')
    const ok = await confirm({ title: `Cancel order ${order.number}?`, confirmText: 'Cancel Order', cancelText: 'Keep Order',
      message: `${restock ? `All ${order.items.reduce((s, i) => s + i.qty, 0)} items will be added back to stock at ${branch?.name}.` : 'Stock was not deducted for this order yet, so inventory will not change.'}${!cod && order.paymentStatus === 'Paid' ? ' The customer has paid online — record a refund afterwards.' : ''} This cannot be undone.` })
    if (!ok) return
    let res
    try { res = updateOrderStatus(order.id, 'Cancelled', 'Order cancelled by admin') } catch (e) { return toast.error(e.message) }
    toast.success(`Order ${order.number} cancelled${res?.restocked ? ' · items restocked' : ''}`)
    if (res?.skippedItems) toast.warning(`${res.skippedItems} item${res.skippedItems === 1 ? '' : 's'} could not be restocked because the product size no longer exists.`)
    if (!cod && order.paymentStatus === 'Paid') toast.info('Payment was collected online. Use Refund to record the refund.')
  }
  const onDownload = () => {
    try { downloadInvoicePdf(order, db); toast.success(`Invoice for ${order.number} downloaded`) } catch (e) { toast.error(`Could not create the PDF: ${e.message}`) }
  }
  const saveNotes = () => { updateOrder(order.id, { notes: notes.trim() }); setNotes(null); toast.success('Internal notes saved') }

  return (
    <>
      <PageHeader title={`Order ${order.number}`} breadcrumbs={[{ label: 'Orders', to: '/orders' }, { label: order.number }]}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status} /><StatusBadge status={order.paymentStatus} /><span>Placed {dateTime(order.createdAt)} · {branch?.name}</span></span>}
        actions={<>
          {canManage && next.length > 0 && <Button icon={RefreshCw} onClick={() => setStatusOpen(true)}>Update Status</Button>}
          <Button variant="outline" icon={Printer} onClick={() => window.print()}>Print Invoice</Button>
          <Button variant="outline" icon={FileDown} onClick={onDownload}>Download Invoice</Button>
          {canManage && canRefund(order) && <Button variant="outline" icon={Undo2} onClick={() => setRefundOpen(true)}>Refund</Button>}
          {canManage && next.includes('Cancelled') && <Button variant="danger-outline" icon={Ban} onClick={onCancel}>Cancel Order</Button>}
        </>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {/* Progress */}
          <Card bodyClassName="px-4 py-5 sm:px-6">
            <ol className="flex items-start" aria-label="Order progress">
              {FLOW.map((s, i) => {
                const done = i <= lastFlow
                const Icon = TL_ICON[s]
                return (
                  <li key={s} className="relative flex flex-1 flex-col items-center text-center">
                    {i > 0 && <span className={cn('absolute top-4 right-1/2 h-0.5 w-full', i <= lastFlow ? 'bg-accent' : 'bg-line')} aria-hidden />}
                    <span className={cn('relative z-10 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white', done ? 'bg-accent text-white' : 'bg-surface text-muted')}><Icon className="h-4 w-4" aria-hidden /></span>
                    <span className={cn('mt-2 text-xs font-medium', done ? 'text-ink' : 'text-muted')}>{s}<span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span></span>
                  </li>
                )
              })}
            </ol>
            {offFlow && <p className={cn('mt-4 rounded-lg px-3 py-2 text-center text-sm font-medium', order.status === 'Cancelled' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700')}>This order was {order.status.toLowerCase()} on {dateTime(order.timeline.findLast((t) => t.status === order.status)?.at)}.</p>}
          </Card>

          <Card title="Order Items" subtitle={`${order.items.length} product${order.items.length > 1 ? 's' : ''} · ${order.items.reduce((s, i) => s + i.qty, 0)} units`} bodyClassName="p-0">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface/60"><tr><th className="th">Product</th><th className="th text-center">Qty</th><th className="th text-right">Unit Price</th><th className="th text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((it, i) => (
                    <tr key={`${it.variantId}_${i}`}>
                      <td className="td">
                        <div className="flex min-w-[14rem] items-center gap-3">
                          <Thumb src={productImage(db, it.productId)} alt={it.name} size={48} />
                          <div className="min-w-0">
                            <Link to={`/products/${it.productId}`} className="font-medium text-ink hover:text-primary">{it.name}</Link>
                            <p className="text-xs text-muted">{it.size}{it.sku ? ` · SKU ${it.sku}` : ''}{it.gst != null ? ` · GST ${it.gst}%` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-center">{it.qty}</td>
                      <td className="td text-right whitespace-nowrap">{inr(it.price)}{it.mrp > it.price && <span className="block text-xs text-muted line-through">{inr(it.mrp)}</span>}</td>
                      <td className="td text-right font-medium whitespace-nowrap">{inr(itemLineTotal(it))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-line p-5">
              <dl className="w-full max-w-xs space-y-2 text-sm">
                <Row k="Subtotal" v={inr(order.subtotal, true)} />
                <Row k="Shipping" v={order.shipping ? inr(order.shipping, true) : <Badge tone="green">Free</Badge>} />
                {order.discount > 0 && <Row k={<>Discount {order.couponCode && <Badge tone="primary" className="ml-1">{order.couponCode}</Badge>}</>} v={<span className="text-accent">− {inr(order.discount, true)}</span>} />}
                {g.gstEnabled && <Row k={`Tax (GST incl.${g.intra ? ', CGST+SGST' : ', IGST'})`} v={inr(g.totalTax, true)} muted />}
                <div className="flex items-center justify-between border-t border-line pt-2.5 text-base font-bold"><dt>Total</dt><dd>{inr(order.total, true)}</dd></div>
                {refunded > 0 && <>
                  <Row k="Refunded" v={<span className="text-red-600">− {inr(refunded, true)}</span>} />
                  <Row k="Net" v={<b>{inr(order.total - refunded, true)}</b>} />
                </>}
              </dl>
            </div>
          </Card>

          <Card title="Order Timeline">
            <ol className="relative">
              {order.timeline.map((t, i) => {
                const refundEv = t.event === 'refund' || /^Refund of/.test(t.note || '')
                const Icon = refundEv ? Undo2 : TL_ICON[t.status] || Package
                const last = i === order.timeline.length - 1
                return (
                  <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    {!last && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-line" aria-hidden />}
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', refundEv ? 'bg-teal-100 text-teal-700' : TL_TONE[t.status] || 'bg-surface text-muted', last && 'ring-4 ring-accent-soft')}><Icon className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 pt-1">
                      <p className="flex flex-wrap items-center gap-x-2 font-medium text-ink">{refundEv ? 'Refund recorded' : t.status}{last && <Badge tone="primary">Latest</Badge>}</p>
                      {t.note && <p className="mt-0.5 text-sm break-words text-ink/80">{t.note}</p>}
                      <p className="mt-0.5 text-xs text-muted">{dateTime(t.at)} · by {t.by}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Customer" actions={customer && <Button as="link" to={`/customers/${customer.id}`} size="sm" variant="outline" icon={User}>View profile</Button>}>
            <div className="flex items-center gap-3">
              <Avatar name={order.customerName} size={44} />
              <div className="min-w-0">
                {customer ? <Link to={`/customers/${customer.id}`} className="font-semibold text-ink hover:text-primary">{order.customerName}</Link> : <p className="font-semibold">{order.customerName}</p>}
                <p className="text-xs text-muted">{customer ? `${db.orders.filter((o) => o.customerId === customer.id).length} orders in total` : 'Customer profile removed'}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center gap-3"><Phone className="h-4 w-4 shrink-0 text-muted" aria-hidden /><a href={`tel:+${phoneDigits}`} className="hover:text-primary">{order.customerPhone}</a></li>
              <li className="flex min-w-0 items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />{order.customerEmail ? <a href={`mailto:${order.customerEmail}`} className="truncate hover:text-primary">{order.customerEmail}</a> : <span className="text-muted">No email</span>}</li>
            </ul>
            <Button as="a" href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hi ${order.customerName}, regarding your RESHMAM order ${order.number}`)}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={MessageCircle} className="mt-4 w-full">Message on WhatsApp</Button>
          </Card>

          <Card title="Shipping">
            <div className="flex gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <address className="not-italic">
                <p className="font-medium">{order.customerName}</p>
                {addressLines(order.shippingAddress).map((l) => <p key={l}>{l}</p>)}
              </address>
            </div>
            <InfoList className="mt-3 border-t border-line" items={[
              ['Fulfilled by', branch?.name],
              ['Courier', order.courier || '—'],
              ['Tracking no.', order.trackingNumber ? <span key="t" className="font-mono">{order.trackingNumber}</span> : '—'],
            ]} />
          </Card>

          <Card title="Payment">
            <InfoList items={[
              ['Method', <span key="m" className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-muted" aria-hidden />{order.paymentMethod}</span>],
              ['Payment ID', order.paymentId ? <span key="p" className="font-mono text-xs break-all">{order.paymentId}</span> : cod ? 'Collected on delivery' : '—'],
              ['Status', <StatusBadge key="s" status={order.paymentStatus} />],
              ['Amount', inr(order.total, true)],
            ]} />
            {cod && order.paymentStatus === 'Pending' && order.status !== 'Cancelled' && <p className="mt-2 text-xs text-muted">Cash will be marked Paid automatically when the order is delivered.</p>}
          </Card>

          {refunds.length > 0 && (
            <Card title="Refunds" subtitle={`${inr(refunded, true)} of ${inr(order.total, true)} refunded`}>
              <ul className="space-y-3">
                {refunds.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
                    <div className="flex items-center justify-between gap-2"><b>{inr(r.amount, true)}</b><Badge tone={REFUND_TONE[r.status] || 'gray'} dot>{r.status === 'Manual' ? 'Manual (recorded)' : r.status}</Badge></div>
                    <p className="mt-1 text-ink/80">{r.reason}</p>
                    <p className="mt-1 text-xs text-muted">{dateTime(r.at)} · {r.method}{r.reference ? ` · Ref ${r.reference}` : ''}</p>
                  </li>
                ))}
              </ul>
              {refunds.some((r) => r.status === 'Pending gateway') && <DemoNote className="mt-3">“Pending gateway” refunds are recorded only. The money is returned through Razorpay once the backend is connected and confirms the refund.</DemoNote>}
            </Card>
          )}

          <Card title="Internal Notes" subtitle="Visible to staff only" actions={canManage && notes === null && <Button size="sm" variant="outline" icon={Pencil} onClick={() => setNotes(order.notes || '')}>{order.notes ? 'Edit' : 'Add note'}</Button>}>
            {notes === null ? <p className="text-sm whitespace-pre-wrap text-ink">{order.notes || <span className="text-muted">No internal notes.</span>}</p> : (
              <div className="space-y-2">
                <Textarea aria-label="Internal notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Customer asked for evening delivery" />
                <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setNotes(null)}>Cancel</Button><Button size="sm" onClick={saveNotes}>Save Notes</Button></div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <InvoicePrint order={order} db={db} />
      <UpdateStatusModal open={statusOpen} order={order} onClose={() => setStatusOpen(false)} />
      <RefundModal open={refundOpen} order={order} onClose={() => setRefundOpen(false)} />
    </>
  )
}

const Row = ({ k, v, muted }) => <div className={cn('flex items-center justify-between gap-4', muted && 'text-muted')}><dt className="flex items-center">{k}</dt><dd className="text-right">{v}</dd></div>

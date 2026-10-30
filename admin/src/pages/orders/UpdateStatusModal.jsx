import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, DemoNote, Field, Input, Modal, Select, StatusBadge, Textarea, useConfirm, useToast } from '../../components/ui'
import { updateOrderStatus, useDb } from '../../services/store'
import { allowedNext, couriersFrom, willRestock } from './orderUtils'

const DEFAULT_NOTE = { Processing: 'Payment confirmed, packing started', Shipped: 'Handed over to courier', Delivered: 'Delivered to customer', Cancelled: 'Order cancelled by admin', Returned: 'Return received' }

/** Change an order's status. Only sensible next statuses are offered; Shipped needs courier + tracking. */
export default function UpdateStatusModal({ open, order, onClose, initialStatus }) {
  const db = useDb()
  const toast = useToast()
  const confirm = useConfirm()
  const options = order ? allowedNext(order) : []
  const couriers = couriersFrom(db.settings)
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm()
  const courierSetting = db.settings.shipping?.couriers
  useEffect(() => {
    if (!open || !order) return
    const opts = allowedNext(order)
    const list = couriersFrom({ shipping: { couriers: courierSetting } })
    reset({ status: initialStatus && opts.includes(initialStatus) ? initialStatus : opts[0] || '', note: '', trackingNumber: order.trackingNumber || '', courier: order.courier || list[0] || '' })
  }, [open, order, initialStatus, reset, courierSetting])
  const status = useWatch({ control, name: 'status' })

  const onSubmit = async (v) => {
    if (['Cancelled', 'Returned'].includes(v.status)) {
      const ok = await confirm({ title: `Mark order ${v.status.toLowerCase()}?`, message: `${order.number} will be marked ${v.status}. ${willRestock(order, v.status) ? 'All items will be added back to stock.' : 'Stock was not deducted for this order yet, so inventory is unchanged.'} This cannot be undone.`, confirmText: `Mark ${v.status}` })
      if (!ok) return
    }
    const extra = v.status === 'Shipped' ? { trackingNumber: v.trackingNumber.trim(), courier: v.courier } : {}
    const note = v.note.trim() || (v.status === 'Shipped' ? `Shipped via ${v.courier} · Tracking ${v.trackingNumber.trim()}` : DEFAULT_NOTE[v.status])
    const restock = willRestock(order, v.status)
    let res
    try { res = updateOrderStatus(order.id, v.status, note, extra) } catch (e) { return toast.error(e.message) }
    toast.success(`${order.number} marked ${v.status}${restock ? ' · items restocked' : res?.deducted ? ' · stock deducted' : ''}`)
    res?.lowStock?.forEach((x) => toast.warning(`Low stock: ${x.sku} has ${x.stock} left`))
    onClose()
  }

  if (!order) return null
  return (
    <Modal open={open} onClose={onClose} title="Update Order Status" subtitle={order.number}
      footer={options.length ? <><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="status-form" loading={isSubmitting}>Update Status</Button></> : <Button variant="outline" onClick={onClose}>Close</Button>}>
      {!options.length ? (
        <p className="text-sm text-muted">This order is <StatusBadge status={order.status} /> — no further status changes are possible.</p>
      ) : (
        <form id="status-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted">Current status: <StatusBadge status={order.status} /></div>
          <Field label="New Status" required htmlFor="st-status" error={errors.status}>
            <Select id="st-status" options={options} error={errors.status} {...register('status', { required: 'Choose a status' })} />
          </Field>
          {status === 'Shipped' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Courier" required htmlFor="st-courier" error={errors.courier}>
                <Select id="st-courier" placeholder="Select courier" options={couriers} error={errors.courier} {...register('courier', { validate: (x, all) => all.status !== 'Shipped' || !!x || 'Courier is required for shipping' })} />
              </Field>
              <Field label="Tracking Number" required htmlFor="st-tracking" error={errors.trackingNumber}>
                <Input id="st-tracking" placeholder="e.g. ST123456789" error={errors.trackingNumber} {...register('trackingNumber', { validate: (x, all) => all.status !== 'Shipped' || (x.trim().length >= 5 && /^[A-Za-z0-9-]+$/.test(x.trim())) || 'Enter a valid tracking number (min 5 letters/digits)' })} />
              </Field>
            </div>
          )}
          <Field label="Note" hint="Shown in the order timeline" htmlFor="st-note">
            <Textarea id="st-note" rows={2} placeholder={DEFAULT_NOTE[status] || ''} {...register('note')} />
          </Field>
          {['Cancelled', 'Returned'].includes(status) && (
            <DemoNote>{willRestock(order, status) ? `Items in this order will be added back to inventory at ${db.branches.find((b) => b.id === order.branchId)?.name}.` : 'This order is still pending, so no stock was reserved and inventory will not change.'} Refunds are recorded separately with the Refund button.</DemoNote>
          )}
        </form>
      )}
    </Modal>
  )
}

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, DemoNote, Field, Input, Modal, Textarea, useConfirm, useToast } from '@admin/_components/ui'
import { recordOrderRefund } from '@admin/_lib/orderActions'
import { inr } from '@admin/_lib/format'
import { isCod, refundable } from './orderUtils'

export default function RefundModal({ open, order, onClose }) {
  const toast = useToast()
  const confirm = useConfirm()
  const max = order ? refundable(order) : 0
  const cod = order ? isCod(order) : false
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm()
  useEffect(() => {
    if (open && order) reset({ amount: refundable(order), reason: '', reference: '' })
  }, [open, order, reset])

  const onSubmit = async (v) => {
    const amount = Number(v.amount)
    const ok = await confirm({ title: 'Record refund?', tone: 'primary', confirmText: 'Record Refund',
      message: cod
        ? `Record a manual refund of ${inr(amount, true)} for ${order.number}. Pay the customer by cash or bank transfer yourself — nothing is sent from this panel.`
        : `Record a refund of ${inr(amount, true)} for ${order.number}. It will stay "Pending gateway" until the backend processes it through Razorpay.` })
    if (!ok) return
    try {
      recordOrderRefund(order.id, { amount, reason: v.reason, reference: v.reference })
      toast.success(cod ? `Manual refund of ${inr(amount, true)} recorded` : `Refund of ${inr(amount, true)} recorded · pending gateway`)
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  if (!order) return null
  return (
    <Modal open={open} onClose={onClose} title="Record Refund" subtitle={`${order.number} · paid ${inr(order.total, true)} via ${order.paymentMethod}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="refund-form" loading={isSubmitting}>Record Refund</Button></>}>
      <form id="refund-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {cod ? (
          <DemoNote>This is a <b>Cash on Delivery</b> order, so there is no online payment to reverse. The refund is recorded as <b>Manual</b> — hand over the cash or make a bank/UPI transfer yourself and note its reference below.</DemoNote>
        ) : (
          <DemoNote><b>No money is moved from this panel.</b> The refund is saved as <b>“Pending gateway”</b>. Once the backend is connected it must call the Razorpay Refunds API for payment <code className="font-mono">{order.paymentId || '—'}</code> and mark the refund Processed after Razorpay confirms it.</DemoNote>
        )}
        <Field label="Refund Amount (₹)" required htmlFor="rf-amount" error={errors.amount} hint={`Up to ${inr(max, true)} can be refunded`}>
          <div className="flex gap-2">
            <Input id="rf-amount" type="number" step="0.01" min="1" inputMode="decimal" error={errors.amount} {...register('amount', { required: 'Enter an amount', validate: (x) => (Number(x) > 0 && Number(x) <= max) || `Amount must be between ₹1 and ${inr(max, true)}` })} />
            <Button variant="outline" onClick={() => setValue('amount', max, { shouldValidate: true })}>Full</Button>
          </div>
        </Field>
        <Field label="Reason" required htmlFor="rf-reason" error={errors.reason}>
          <Textarea id="rf-reason" rows={2} placeholder="e.g. Bottle damaged in transit" error={errors.reason} {...register('reason', { required: 'Reason is required', minLength: { value: 3, message: 'Reason is too short' } })} />
        </Field>
        {cod && (
          <Field label="Payment Reference" hint="Optional — UPI / bank transaction ID or cash receipt no." htmlFor="rf-ref">
            <Input id="rf-ref" {...register('reference')} />
          </Field>
        )}
      </form>
    </Modal>
  )
}

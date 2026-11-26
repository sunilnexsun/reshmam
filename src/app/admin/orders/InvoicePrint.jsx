// Print-only invoice. Rendered into <body> via a portal; on screen it is hidden, and when printing
// everything else on the page is hidden so only the invoice is printed (window.print()).
import { createPortal } from 'react-dom'
import { date, inr } from '@admin/_lib/format'
import { resolveOrderInvoice } from '@admin/_lib/invoice'
import { refundedAmount } from '@admin/_lib/orderActions'
import { addressLines, companyLines, gstBreakdown, itemLineTotal } from './orderUtils'

const PRINT_CSS = `
.invoice-print { display: none; }
@media print {
  @page { size: A4; margin: 14mm; }
  body > *:not(.invoice-print) { display: none !important; }
  .invoice-print { display: block !important; color: #202b27; font-size: 11px; }
  .invoice-print table { width: 100%; border-collapse: collapse; }
  .invoice-print th, .invoice-print td { padding: 6px 8px; border-bottom: 1px solid #e3e8e6; text-align: left; vertical-align: top; }
  .invoice-print th { background: #064e3b !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: 600; }
  .invoice-print .r { text-align: right; }
  .invoice-print .c { text-align: center; }
}`

/** Prints the invoice for an order (issued invoice when confirmed, or proforma before that). */
export default function InvoicePrint({ order, db }) {
  const resolved = resolveOrderInvoice(order, db?.settings)
  if (!resolved) return null
  const { invoice, isProforma } = resolved
  const company = invoice.company || db?.settings?.company || {}
  const tax = invoice.tax || db?.settings?.tax || {}
  const gstin = tax.gstin
  const showHsn = tax.gstEnabled !== false && tax.hsnOnInvoice !== false
  const branch = (db?.branches || []).find((b) => b.id === order.branchId)
  const hsn = Object.fromEntries((db?.products || []).map((p) => [p.id, p.hsn]))
  const g = gstBreakdown(order, invoice)
  const refunded = refundedAmount(order)
  const orderNo = order.number || order.order_number || order.id
  const items = order.items || []
  return createPortal(
    <div className="invoice-print" aria-hidden>
      <style>{PRINT_CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, borderBottom: '2px solid #064e3b', paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#064e3b' }}>{company.brand || 'RESHMAM'}</div>
          {company.legalName && <div style={{ fontWeight: 600 }}>{company.legalName}</div>}
          {companyLines(company).map((l) => <div key={l}>{l}</div>)}
          {gstin && <div><b>GSTIN:</b> {gstin}</div>}
          {company.fssai && <div><b>FSSAI:</b> {company.fssai}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isProforma ? 'PROFORMA INVOICE' : tax.gstEnabled !== false ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</div>
          {['Cancelled', 'Returned'].includes(order.status) && <div style={{ fontWeight: 700, color: '#b91c1c' }}>ORDER {order.status.toUpperCase()}</div>}
          <div>Invoice No: <b>{invoice.number}</b></div>
          <div>Order No: <b>{orderNo}</b></div>
          <div>Order Date: {date(order.createdAt)}</div>
          <div>Invoice Date: {date(invoice.date)}</div>
          <div>Branch: {branch?.name || '—'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, margin: '12px 0' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#064e3b', fontSize: 10, letterSpacing: 0.5 }}>BILL TO / SHIP TO</div>
          <div style={{ fontWeight: 600 }}>{order.customerName}</div>
          {addressLines(order.shippingAddress).map((l) => <div key={l}>{l}</div>)}
          {order.customerPhone && <div>Phone: {order.customerPhone}</div>}
          {order.customerEmail && <div>Email: {order.customerEmail}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Payment: {order.paymentMethod || '—'}</div>
          <div>Status: {order.paymentStatus || '—'}</div>
          {order.paymentId && <div>Payment ID: {order.paymentId}</div>}
          <div>Place of supply: {order.shippingAddress?.state || tax.placeOfSupply || '—'}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Item</th>{showHsn && <th>HSN</th>}<th className="c">Qty</th><th className="r">Rate</th>{tax.gstEnabled !== false && <th className="c">GST</th>}<th className="r">Amount</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={(it.variantId || it.productId || i) + '_' + i}><td>{i + 1}</td><td>{it.name} – {it.size}<div style={{ color: '#64716c', fontSize: 9 }}>SKU: {it.sku || '—'}</div></td>{showHsn && <td>{hsn[it.productId] || '—'}</td>}<td className="c">{it.qty}</td><td className="r">{inr(it.price, true)}</td>{tax.gstEnabled !== false && <td className="c">{it.gst ?? tax.defaultGst ?? 0}%</td>}<td className="r">{inr(itemLineTotal(it), true)}</td></tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 14, alignItems: 'flex-start' }}>
        <div style={{ width: '55%' }}>
          {g.gstEnabled ? <><table>
            <thead><tr><th>GST</th><th className="r">Taxable</th>{g.intra ? <><th className="r">CGST</th><th className="r">SGST</th></> : <th className="r">IGST</th>}<th className="r">Tax</th></tr></thead>
            <tbody>{g.rows.map((r) => <tr key={r.rate}><td>{r.rate}%</td><td className="r">{inr(r.taxable, true)}</td>{g.intra ? <><td className="r">{inr(r.cgst, true)}</td><td className="r">{inr(r.sgst, true)}</td></> : <td className="r">{inr(r.igst, true)}</td>}<td className="r">{inr(r.tax, true)}</td></tr>)}</tbody>
          </table>
          <div style={{ color: '#64716c', fontSize: 9, marginTop: 6 }}>All prices are inclusive of GST.</div></>
            : <div style={{ color: '#64716c', fontSize: 9 }}>GST is not charged on this bill.</div>}
        </div>
        <table style={{ width: '40%' }}>
          <tbody>
            <tr><td>Subtotal</td><td className="r">{inr(order.subtotal, true)}</td></tr>
            <tr><td>Shipping</td><td className="r">{order.shipping ? inr(order.shipping, true) : 'Free'}</td></tr>
            {order.discount > 0 && <tr><td>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</td><td className="r">− {inr(order.discount, true)}</td></tr>}
            {g.gstEnabled && <tr><td>GST included</td><td className="r">{inr(g.totalTax, true)}</td></tr>}
            <tr><td style={{ fontWeight: 700, fontSize: 13 }}>Total</td><td className="r" style={{ fontWeight: 700, fontSize: 13 }}>{inr(order.total, true)}</td></tr>
            {refunded > 0 && <tr><td>Refunded</td><td className="r">− {inr(refunded, true)}</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', color: '#64716c', fontSize: 9, borderTop: '1px solid #e3e8e6', paddingTop: 8 }}>
        <div>Thank you for shopping with {company.brand || 'RESHMAM'}.<br />This is a computer-generated invoice and does not require a signature.</div>
        <div style={{ textAlign: 'right' }}>For {company.legalName || company.brand}</div>
      </div>
    </div>,
    document.body,
  )
}

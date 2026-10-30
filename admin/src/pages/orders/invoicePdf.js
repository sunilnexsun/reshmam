// GST-inclusive tax invoice as a real PDF (jsPDF + autoTable). jsPDF fonts lack "₹" → rs().
import { jsPDF, autoTable, rs } from '../../utils/export'
import { date } from '../../utils/format'
import { refundedAmount } from '../../services/orderActions'
import { addressLines, companyLines, gstBreakdown, invoiceNumber } from './orderUtils'

const GREEN = [6, 78, 59]
const INK = [32, 43, 39]
const MUTED = [100, 113, 108]

export function downloadInvoicePdf(order, db) {
  const { company = {}, tax = {} } = db.settings
  const branch = db.branches.find((b) => b.id === order.branchId)
  const gstin = company.gstin || tax.gstin
  const showHsn = tax.hsnOnInvoice !== false
  const products = Object.fromEntries(db.products.map((p) => [p.id, p]))
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40

  // Header — seller
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...GREEN)
  doc.text(company.brand || 'RESHMAM', M, 50)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  let y = 64
  ;[company.legalName, ...companyLines(company), gstin && `GSTIN: ${gstin}`, company.fssai && `FSSAI Lic. No: ${company.fssai}`].filter(Boolean).forEach((l) => { doc.text(l, M, y); y += 12 })

  // Header — invoice meta
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
  doc.text('TAX INVOICE', W - M, 50, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK)
  const meta = [['Invoice No', invoiceNumber(order, db.settings)], ['Order No', order.number], ['Order Date', date(order.createdAt)], ['Invoice Date', date(new Date())], ['Branch', branch?.name || '—'], ['Payment', `${order.paymentMethod} (${order.paymentStatus})`]]
  meta.forEach(([k, v], i) => {
    doc.setTextColor(...MUTED); doc.text(`${k}:`, W - M - 190, 66 + i * 12)
    doc.setTextColor(...INK); doc.text(String(v), W - M, 66 + i * 12, { align: 'right' })
  })
  y = Math.max(y, 66 + meta.length * 12) + 8
  doc.setDrawColor(227, 232, 230); doc.line(M, y, W - M, y)
  y += 18

  // Bill to / Ship to
  const a = order.shippingAddress || {}
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GREEN)
  doc.text('BILL TO / SHIP TO', M, y)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK)
  y += 13
  ;[order.customerName, ...addressLines(a), order.customerPhone && `Phone: ${order.customerPhone}`, order.customerEmail && `Email: ${order.customerEmail}`].filter(Boolean).forEach((l) => { doc.text(l, M, y); y += 12 })
  doc.setTextColor(...MUTED); doc.text(`Place of supply: ${a.state || tax.placeOfSupply || '—'}`, W - M, y - 12, { align: 'right' })

  // Items
  const head = ['#', 'Item', ...(showHsn ? ['HSN'] : []), 'Qty', 'Rate', 'GST', 'Amount']
  const body = order.items.map((it, i) => [i + 1, `${it.name} – ${it.size}\nSKU: ${it.sku}`, ...(showHsn ? [products[it.productId]?.hsn || '—'] : []), it.qty, rs(it.price), `${it.gst}%`, rs(it.total)])
  autoTable(doc, {
    head: [head], body, startY: y + 6, margin: { left: M, right: M },
    styles: { fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [227, 232, 230], lineWidth: 0.5 },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 24 }, [head.length - 1]: { halign: 'right' }, [head.length - 2]: { halign: 'center' }, [head.length - 3]: { halign: 'right' }, [head.length - 4]: { halign: 'center' } },
  })
  y = doc.lastAutoTable.finalY + 14

  // Totals (right column)
  const totals = [
    ['Subtotal', rs(order.subtotal)],
    ['Shipping', order.shipping ? rs(order.shipping) : 'Free'],
    ...(order.discount ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${rs(order.discount)}`]] : []),
    ['GST included', rs(order.tax ?? gstBreakdown(order, db.settings).totalTax)],
  ]
  if (y > 700) { doc.addPage(); y = 50 }
  const startTotals = y
  doc.setFontSize(9)
  totals.forEach(([k, v]) => { doc.setTextColor(...MUTED); doc.text(k, W - M - 200, y); doc.setTextColor(...INK); doc.text(v, W - M, y, { align: 'right' }); y += 14 })
  doc.setDrawColor(...GREEN); doc.line(W - M - 200, y - 6, W - M, y - 6)
  y += 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('Total', W - M - 200, y); doc.text(rs(order.total), W - M, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  const refunded = refundedAmount(order)
  if (refunded) { y += 14; doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text('Refunded', W - M - 200, y); doc.text(`- ${rs(refunded)}`, W - M, y, { align: 'right' }) }

  // GST breakdown (left column)
  const g = gstBreakdown(order, db.settings)
  autoTable(doc, {
    head: [g.intra ? ['GST rate', 'Taxable value', 'CGST', 'SGST', 'Total tax'] : ['GST rate', 'Taxable value', 'IGST', 'Total tax']],
    body: g.rows.map((r) => (g.intra ? [`${r.rate}%`, rs(r.taxable), rs(r.cgst), rs(r.sgst), rs(r.tax)] : [`${r.rate}%`, rs(r.taxable), rs(r.igst), rs(r.tax)])),
    startY: startTotals - 10, margin: { left: M, right: W - M - 300 }, tableWidth: 280,
    styles: { fontSize: 8, cellPadding: 4, textColor: INK, lineColor: [227, 232, 230], lineWidth: 0.5 },
    headStyles: { fillColor: [245, 247, 246], textColor: INK, fontStyle: 'bold' },
  })
  doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text(doc.splitTextToSize('All prices are inclusive of GST. GST is calculated on item value before shipping and discount.', 280), M, doc.lastAutoTable.finalY + 12)

  // Footer
  const H = doc.internal.pageSize.getHeight()
  doc.setDrawColor(227, 232, 230); doc.line(M, H - 60, W - M, H - 60)
  doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text(`Thank you for shopping with ${company.brand || 'RESHMAM'}${company.tagline ? ` — ${company.tagline}` : ''}`, M, H - 46)
  doc.text('This is a computer-generated invoice and does not require a signature.', M, H - 34)
  doc.text(`For ${company.legalName || company.brand || 'RESHMAM'}`, W - M, H - 46, { align: 'right' })

  doc.save(`Invoice-${order.number}.pdf`)
}

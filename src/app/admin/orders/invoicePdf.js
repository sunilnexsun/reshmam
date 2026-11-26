// GST-inclusive tax invoice as a real PDF (jsPDF + autoTable). jsPDF fonts lack "₹" → rs().
import { jsPDF, autoTable, rs } from '@admin/_lib/export'
import { date } from '@admin/_lib/format'
import { resolveOrderInvoice } from '@admin/_lib/invoice'
import { refundedAmount } from '@admin/_lib/orderActions'
import { resolveInvoiceLogo } from './invoiceLogo'
import { addressLines, companyLines, gstBreakdown, itemLineTotal } from './orderUtils'

const GREEN = [6, 78, 59]
const INK = [32, 43, 39]
const MUTED = [100, 113, 108]

/** Downloads a real PDF invoice for an order (Tax Invoice / Bill of Supply / Proforma). */
export async function downloadInvoicePdf(order, db) {
  const resolved = resolveOrderInvoice(order, db?.settings)
  if (!resolved) throw new Error('Order data is missing.')
  const { invoice, isProforma } = resolved
  const company = invoice.company || db?.settings?.company || {}
  const tax = invoice.tax || db?.settings?.tax || {}
  const branch = (db?.branches || []).find((b) => b.id === order.branchId)
  const gstin = tax.gstin
  const showHsn = tax.gstEnabled !== false && tax.hsnOnInvoice !== false
  const products = Object.fromEntries((db?.products || []).map((p) => [p.id, p]))
  const orderNo = order.number || order.order_number || order.id
  const items = order.items || []
  const logo = await resolveInvoiceLogo(db?.settings?.company?.logo || company.logo)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40

  // Header — seller logo + company details
  let y = 50
  if (logo) {
    const maxH = 38
    const maxW = 130
    const ratio = Math.min(maxW / logo.width, maxH / logo.height)
    const drawW = Math.round(logo.width * ratio)
    const drawH = Math.round(logo.height * ratio)
    doc.addImage(logo.dataUrl, 'PNG', M, 28, drawW, drawH)
    y = 28 + drawH + 14
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...GREEN)
    doc.text(company.brand || 'RESHMAM', M, y)
    y += 14
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  ;[company.legalName, ...companyLines(company), gstin && `GSTIN: ${gstin}`, company.fssai && `FSSAI Lic. No: ${company.fssai}`].filter(Boolean).forEach((l) => { doc.text(String(l), M, y); y += 12 })

  // Header — invoice meta
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
  doc.text(isProforma ? 'PROFORMA INVOICE' : tax.gstEnabled !== false ? 'TAX INVOICE' : 'BILL OF SUPPLY', W - M, 50, { align: 'right' })
  if (['Cancelled', 'Returned'].includes(order.status)) {
    doc.setFontSize(9); doc.setTextColor(185, 28, 28); doc.text(`ORDER ${order.status.toUpperCase()}`, W - M - 120, 50, { align: 'right' }); doc.setTextColor(...INK)
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK)
  const meta = [['Invoice No', invoice.number], ['Order No', orderNo], ['Order Date', date(order.createdAt)], ['Invoice Date', date(invoice.date)], ['Branch', branch?.name || '—'], ['Payment', `${order.paymentMethod || '—'} (${order.paymentStatus || '—'})`]]
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
  ;[order.customerName, ...addressLines(a), order.customerPhone && `Phone: ${order.customerPhone}`, order.customerEmail && `Email: ${order.customerEmail}`].filter(Boolean).forEach((l) => { doc.text(String(l), M, y); y += 12 })
  doc.setTextColor(...MUTED); doc.text(`Place of supply: ${a.state || tax.placeOfSupply || '—'}`, W - M, y - 12, { align: 'right' })

  // Items
  const g = gstBreakdown(order, invoice)
  const head = ['#', 'Item', ...(showHsn ? ['HSN'] : []), 'Qty', 'Rate', ...(g.gstEnabled ? ['GST'] : []), 'Amount']
  const body = items.map((it, i) => [i + 1, `${it.name || 'Product'} – ${it.size || ''}\nSKU: ${it.sku || '—'}`, ...(showHsn ? [products[it.productId]?.hsn || '—'] : []), it.qty || 1, rs(it.price), ...(g.gstEnabled ? [`${Number(it.gst) || 0}%`] : []), rs(itemLineTotal(it))])
  autoTable(doc, {
    head: [head], body, startY: y + 6, margin: { left: M, right: M },
    styles: { fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [227, 232, 230], lineWidth: 0.5 },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(head.map((h, i) => [i, i === 0 ? { cellWidth: 24 } : { halign: { Qty: 'center', GST: 'center', Rate: 'right', Amount: 'right' }[h] || 'left' }])),
  })
  y = doc.lastAutoTable.finalY + 14

  // Totals (right column)
  const totals = [
    ['Subtotal', rs(order.subtotal)],
    ['Shipping', order.shipping ? rs(order.shipping) : 'Free'],
    ...(order.discount ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${rs(order.discount)}`]] : []),
    ...(g.gstEnabled ? [['GST included', rs(g.totalTax)]] : []),
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
  if (!g.gstEnabled) {
    doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text('GST is not charged on this bill.', M, startTotals)
  } else {
  autoTable(doc, {
    head: [g.intra ? ['GST rate', 'Taxable value', 'CGST', 'SGST', 'Total tax'] : ['GST rate', 'Taxable value', 'IGST', 'Total tax']],
    body: g.rows.map((r) => (g.intra ? [`${r.rate}%`, rs(r.taxable), rs(r.cgst), rs(r.sgst), rs(r.tax)] : [`${r.rate}%`, rs(r.taxable), rs(r.igst), rs(r.tax)])),
    startY: startTotals - 10, margin: { left: M, right: W - M - 300 }, tableWidth: 280,
    styles: { fontSize: 8, cellPadding: 4, textColor: INK, lineColor: [227, 232, 230], lineWidth: 0.5 },
    headStyles: { fillColor: [245, 247, 246], textColor: INK, fontStyle: 'bold' },
  })
  doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text(doc.splitTextToSize('All prices are inclusive of GST. GST is calculated on item value after discount, excluding shipping.', 280), M, doc.lastAutoTable.finalY + 12)
  }

  // Footer
  const H = doc.internal.pageSize.getHeight()
  doc.setDrawColor(227, 232, 230); doc.line(M, H - 60, W - M, H - 60)
  doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text(`Thank you for shopping with ${company.brand || 'RESHMAM'}${company.tagline ? ` — ${company.tagline}` : ''}`, M, H - 46)
  doc.text('This is a computer-generated invoice and does not require a signature.', M, H - 34)
  doc.text(`For ${company.legalName || company.brand || 'RESHMAM'}`, W - M, H - 46, { align: 'right' })

  doc.save(`Invoice-${orderNo}.pdf`)
}

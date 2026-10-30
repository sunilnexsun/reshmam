// Real file exports: CSV, Excel (xlsx), PDF (jspdf-autotable) and print.
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const download = (blob, filename) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
/** columns: [{ key, label, value?(row) }] */
const toMatrix = (rows, columns) => [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => (c.value ? c.value(r) : r[c.key]) ?? ''))]

export function exportCSV(filename, rows, columns) {
  const esc = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = toMatrix(rows, columns).map((r) => r.map(esc).join(',')).join('\n')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}
export function exportExcel(filename, rows, columns, sheet = 'Report') {
  const ws = XLSX.utils.aoa_to_sheet(toMatrix(rows, columns))
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31))
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
/** PDF table. Note: jsPDF default fonts lack "₹" — pass plain numbers or "Rs." strings. */
export function exportPDF(filename, title, rows, columns, { subtitle, orientation = 'portrait' } = {}) {
  const doc = new jsPDF({ orientation, unit: 'pt' })
  doc.setFontSize(16); doc.setTextColor(6, 78, 59); doc.text('RESHMAM', 40, 40)
  doc.setFontSize(12); doc.setTextColor(32, 43, 39); doc.text(title, 40, 60)
  if (subtitle) { doc.setFontSize(9); doc.setTextColor(100); doc.text(subtitle, 40, 75) }
  const [head, ...body] = toMatrix(rows, columns)
  autoTable(doc, { head: [head], body, startY: subtitle ? 88 : 75, styles: { fontSize: 8 }, headStyles: { fillColor: [6, 78, 59] } })
  doc.save(`${filename}.pdf`)
  return doc
}
export const rs = (n) => `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n) || 0)}`
export { jsPDF, autoTable, download }

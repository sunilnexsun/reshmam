// Real file exports: CSV, Excel (xlsx), PDF (jspdf-autotable) and print.
import writeExcelFile from 'write-excel-file/browser'
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

// Spreadsheet apps run a cell that starts with = + - @ (or a tab / carriage return) as a formula, so a
// customer named "=HYPERLINK(...)" would become a live link. Such text gets a leading apostrophe, which
// makes it plain text. Real numbers (including "-12.5" and "-3%") are left alone.
const FORMULA_START = /^[=+\-@\t\r]/
const NUMERIC = /^-?\d+(\.\d+)?%?$/
export const csvSafe = (v) => (typeof v === 'string' && FORMULA_START.test(v) && !NUMERIC.test(v) ? `'${v}` : v)

export function exportCSV(filename, rows, columns) {
  const esc = (v) => { const s = String(csvSafe(v)); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = toMatrix(rows, columns).map((r) => r.map(esc).join(',')).join('\n')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}
/** Excel cells are written as typed values (text stays text), so they can't turn into formulas. */
export async function exportExcel(filename, rows, columns, sheet = 'Report') {
  const [head, ...body] = toMatrix(rows, columns)
  const data = [head.map((value) => ({ value, fontWeight: 'bold' })), ...body.map((r) => r.map((v) => (v === '' ? null : v)))]
  await writeExcelFile(data, { sheet: sheet.slice(0, 31), stickyRowsCount: 1 }).toFile(`${filename}.xlsx`)
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

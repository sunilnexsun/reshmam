// Shared helpers for the Inventory module.

/** Stock operations offered from the Inventory header. `mode` controls the form. */
export const OPERATIONS = {
  'Stock In': { title: 'Stock In', desc: 'Add received stock to a branch.', mode: 'add', submit: 'Add Stock' },
  'Purchase Entry': { title: 'Purchase Entry', desc: 'Record a supplier purchase invoice and add the stock.', mode: 'add', submit: 'Save Purchase' },
  'Stock Out': { title: 'Stock Out', desc: 'Remove stock for counter sales, samples or internal use.', mode: 'remove', submit: 'Remove Stock' },
  Damaged: { title: 'Damaged Stock', desc: 'Write off leaked, broken or expired stock.', mode: 'remove', submit: 'Record Damage' },
  Adjustment: { title: 'Stock Adjustment', desc: 'Set the counted stock level after a physical stock check.', mode: 'set', submit: 'Save Adjustment' },
}

export const MOVE_TONE = {
  'Stock In': 'green', 'Purchase Entry': 'green', Return: 'teal', 'Transfer In': 'blue',
  'Stock Out': 'amber', Order: 'gray', Damaged: 'red', 'Transfer Out': 'purple', Adjustment: 'gray',
}

export const STOCK_FILTERS = [
  { value: 'attention', label: 'Needs restock (low + out)' },
  { value: 'low', label: 'Low stock only' },
  { value: 'out', label: 'Out of stock' },
  { value: 'in', label: 'In stock' },
]
export const matchStockFilter = (r, f) => f === 'all' || (f === 'attention' && r.stock <= r.alertStock) || (f === 'low' && r.stock > 0 && r.stock <= r.alertStock) || (f === 'out' && r.stock <= 0) || (f === 'in' && r.stock > r.alertStock)

const pad = (n) => String(n).padStart(2, '0')
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
/** yyyy-mm-dd from a date input → ISO timestamp. Today keeps the current time so ordering stays correct. */
export const inputDateToIso = (s) => (!s || s === todayStr() ? new Date().toISOString() : new Date(`${s}T12:00:00`).toISOString())

export const signed = (n) => (n > 0 ? `+${n}` : String(n))

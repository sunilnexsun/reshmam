// Staged inline edits in Price Management. A draft holds ONLY the fields the user has typed into, so saving
// never writes back a value that was merely on screen — e.g. stock that an order changed after the page opened.

export const FIELDS = ['price', 'mrp', 'stock', 'status']

/** Form values for a variant (inputs work with strings). */
export const draftOf = (v) => ({ price: String(v.price), mrp: String(v.mrp), stock: String(v.stock), status: v.status })

/** A draft after the user types `value` into field `k`. Only that field is recorded — never the rest of the row. */
export const withEdit = (draft, k, value) => ({ ...draft, [k]: value })

/** What the row shows: live values with the user's edits on top. */
export const currentValues = (v, draft) => ({ ...draftOf(v), ...draft })

/** Validation of what the row shows. */
export function rowErrors(d) {
  const e = {}
  if (!(Number(d.price) > 0) || d.price === '') e.price = 'Price must be more than 0'
  if (d.mrp === '' || !Number.isFinite(Number(d.mrp))) e.mrp = 'MRP is required'
  else if (Number(d.mrp) < Number(d.price)) e.mrp = 'MRP must be ≥ price'
  if (d.stock === '' || !Number.isInteger(Number(d.stock)) || Number(d.stock) < 0) e.stock = 'Whole number ≥ 0'
  return e
}

/** The fields the user edited whose value differs from the live variant: { price?, mrp?, stock?, status? }. */
export function variantPatch(draft = {}, live) {
  const patch = {}
  FIELDS.forEach((k) => {
    if (k in draft && String(draft[k]) !== String(live[k])) patch[k] = k === 'status' ? draft[k] : Number(draft[k])
  })
  return patch
}

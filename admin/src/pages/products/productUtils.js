// Small helpers shared by the Products and Price Management pages.
import { inr } from '../../utils/format'

export const GST_RATES = [0, 5, 12, 18]

/** Discount % of selling price vs MRP (0 when MRP missing or below price). */
export const discountPct = (price, mrp) => {
  price = Number(price); mrp = Number(mrp)
  return mrp > 0 && price > 0 && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0
}

/** "₹75" or "₹75 – ₹270" */
export const priceRange = (min, max) => (min === max ? inr(min) : `${inr(min)} – ${inr(max)}`)

/** Normalises a size label for duplicate checks: "1 L" == "1l" == "1 l". */
export const normSize = (s = '') => String(s).toLowerCase().replace(/\s+/g, '')

const STOP = new Set(['oil', 'pure', 'traditional', 'cold', 'pressed', 'premium', 'the', 'and', 'of', 'with', 'for', 'rotary', 'pack'])

/** Suggests a product SKU like "VM-COC" from brand + name; appends -2, -3 … until unique. */
export function suggestSku(name = '', brand = '', taken = []) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  const core = words.filter((w) => !STOP.has(w.toLowerCase()))
  const parts = (core.length ? core : words).slice(0, 2).map((w) => w.slice(0, 3))
  if (!parts.length) return ''
  const bw = brand.toUpperCase().replace(/[^A-Z ]/g, '').split(/\s+/).filter(Boolean)
  // "Velum Mayilum" → VM ; "Reshmam" → RS (first letter + first consonant after it)
  const prefix = bw.length > 1 ? bw.map((w) => w[0]).join('').slice(0, 2) : bw[0] ? bw[0][0] + (bw[0].slice(1).match(/[^AEIOU]/)?.[0] || '') : ''
  const base = [prefix, ...parts].filter(Boolean).join('-')
  const used = new Set(taken.map((t) => String(t).toUpperCase()))
  if (!used.has(base)) return base
  let i = 2
  while (used.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

/** Variant SKU: PRODUCTSKU-BRANCH-SIZE, e.g. VM-COC-VM-500ML */
export const variantSku = (productSku, branch, size) =>
  [productSku, (branch?.code || '').replace(/\d+$/, '') || 'BR', normSize(size).toUpperCase()].filter(Boolean).join('-')

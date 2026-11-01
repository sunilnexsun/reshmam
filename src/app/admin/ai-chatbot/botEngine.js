// Rule-based reply engine for the chatbot SIMULATOR. No AI provider is called — replies come
// from enabled flows (keyword match), the knowledge base (word overlap) and live catalogue data.
import { inr } from '@admin/_lib/format'

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'i', 'my', 'me', 'to', 'of', 'for', 'and', 'or', 'do', 'you', 'your', 'what', 'how', 'can', 'in', 'on', 'it', 'this', 'that', 'with', 'please', 'pls', 'have', 'has', 'be', 'will', 'want', 'need', 'any', 'from', 'about'])
export const normalize = (s = '') => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim()
const words = (s) => normalize(s).split(' ').filter((w) => w && !STOP.has(w))
const hasKeyword = (text, kw) => {
  const k = normalize(kw)
  if (!k) return false
  if (k.includes(' ')) return text.includes(k)
  return text.split(' ').some((w) => w === k || (k.length >= 4 && w.startsWith(k)))
}
export const splitList = (s) => (Array.isArray(s) ? s : String(s || '').split(',')).map((x) => x.trim()).filter(Boolean)

function findProduct(db, text) {
  let best = null
  db.products.filter((p) => p.status === 'Active').forEach((p) => {
    const nameWords = words(p.name).filter((w) => !['oil', 'traditional', 'cold', 'pressed', 'pack'].includes(w))
    const hits = nameWords.filter((w) => text.includes(w)).length + (text.includes(normalize(p.category)) ? 1 : 0)
    if (hits && (!best || hits > best.hits)) best = { p, hits }
  })
  return best?.p
}
function priceLines(db, p) {
  const br = Object.fromEntries(db.branches.map((b) => [b.id, b]))
  return db.variants.filter((v) => v.productId === p.id && v.status === 'Active' && br[v.branchId]?.status === 'Active')
    .slice(0, 6)
    .map((v) => `• ${v.size} – ${inr(v.price)} (${br[v.branchId].name}${v.stock > 0 ? ', in stock' : ', out of stock'})`)
}

/**
 * Returns { text, buttons, source, flowId?, handover? } for a user message.
 * `context.flowId` = the flow that produced the previous reply (for button navigation).
 */
export function reply(db, input, context = {}) {
  const { settings, flows, knowledge } = db.chatbot
  const text = normalize(input)
  const active = flows.filter((f) => f.enabled)
  const byName = (name) => active.find((f) => normalize(f.name) === normalize(name))

  if (!text) return { text: 'Please type a message.', buttons: [], source: 'fallback' }

  // 1. Human handover keywords
  if (settings.handover && splitList(settings.handoverKeywords).some((k) => hasKeyword(text, k))) {
    return { text: settings.handoverMessage || 'Connecting you to our support team.', buttons: [], source: 'handover', handover: true }
  }

  // 2. Order lookup (RSH-10234)
  const orderNo = input.toUpperCase().match(/RSH-?\s?(\d{4,6})/)
  if (orderNo) {
    const o = db.orders.find((x) => x.number === `RSH-${orderNo[1]}`)
    if (o) {
      const extra = o.trackingNumber ? ` Courier: ${o.courier}, tracking no. ${o.trackingNumber}.` : ''
      return { text: `Order ${o.number} (${o.items.length} item${o.items.length > 1 ? 's' : ''}, ${inr(o.total)}) is currently *${o.status}*. Payment: ${o.paymentStatus}.${extra}`, buttons: ['Shipping Info', 'Talk to Support'], source: 'order lookup' }
    }
    return { text: `I couldn't find order RSH-${orderNo[1]}. Please check the number or talk to our support team.`, buttons: ['Talk to Support'], source: 'order lookup' }
  }

  // 3. Button navigation: a quick-reply naming one of the current flow's next steps
  const current = context.flowId && flows.find((f) => f.id === context.flowId)
  let flow = null
  if (/^back$|^menu$|^start$/.test(text)) flow = active.find((f) => f.id === 'f_welcome') || active[0]
  if (!flow && current) {
    const nexts = current.next.map((id) => active.find((f) => f.id === id)).filter(Boolean)
    flow = nexts.find((f) => normalize(f.name) === text || normalize(f.name).includes(text) || text.includes(normalize(f.name)))
  }
  if (!flow) flow = byName(input)

  // 4. Keyword match across flows (most keyword hits wins)
  if (!flow) {
    // Words that name a product (oil, coconut…) describe the subject, not the intent — weigh them less
    // so “price of coconut oil” reaches Price & Availability rather than Product Queries.
    const catalogue = normalize(db.products.map((p) => `${p.name} ${p.category}`).join(' ')).split(' ')
    const weight = (k) => (catalogue.includes(normalize(k)) ? 0.4 : 1)
    let best = null
    active.forEach((f) => {
      const hits = splitList(f.keywords).filter((k) => hasKeyword(text, k)).reduce((sum, k) => sum + weight(k), 0)
      if (hits && (!best || hits > best.hits)) best = { f, hits }
    })
    // 5. Knowledge base (word overlap) — competes with weak flow matches
    const qWords = words(input)
    let kb = null
    knowledge.filter((k) => k.type !== 'Document' && k.answer).forEach((k) => {
      const kw = words(k.question)
      const overlap = kw.filter((w) => qWords.some((q) => q === w || (q.length >= 4 && w.startsWith(q)) || (w.length >= 4 && q.startsWith(w)))).length
      const score = kw.length ? overlap / kw.length : 0
      if (overlap >= 1 && score >= 0.4 && (!kb || score > kb.score)) kb = { k, score }
    })
    // KB wins when no intent keyword matched, or when the question is a near-exact match.
    if (kb && (!best || (best.hits < 1 && kb.score >= 0.6) || kb.score >= 0.9)) return { text: kb.k.answer, buttons: [], source: `knowledge base · ${kb.k.type}` }
    flow = best?.f
  }

  if (flow) {
    let out = flow.response
    if (out.includes('{{product_name}}') || flow.id === 'f_price') {
      const p = findProduct(db, text)
      if (p) {
        const lines = priceLines(db, p)
        out = out.replace(/\{\{product_name\}\}/g, p.name) + (lines.length ? `\n\n${lines.join('\n')}` : '\n\nThis product is currently unavailable.')
      } else out = out.replace(/\{\{product_name\}\}/g, 'the product you mention')
    }
    const human = /human|support/i.test(flow.name) && flow.next.length === 0
    return { text: out, buttons: flow.buttons || [], source: `flow · ${flow.name}`, flowId: flow.id, handover: human && settings.handover }
  }

  const welcome = active.find((f) => f.id === 'f_welcome')
  return { text: `Sorry, I didn't understand that. You can ask about products, prices, order tracking, shipping or returns.${settings.handover ? ' Type “agent” to talk to our team.' : ''}`, buttons: welcome?.buttons || [], source: 'fallback', flowId: welcome?.id }
}

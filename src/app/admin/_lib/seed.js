// Realistic SAMPLE data for the RESHMAM admin panel (frontend-only phase).
// Generated deterministically relative to the moment it is first loaded, so charts always
// show recent activity. Everything here is demo data and is clearly labelled as such in the UI;
// replace with API calls when the backend is connected (see _lib/store.js).
import { orderGst } from './gst'
import { withIssuedInvoices } from './invoice'
import coconut from '@admin/_assets/products/coconut.webp'
import gingelly from '@admin/_assets/products/gingelly.webp'
import groundnut from '@admin/_assets/products/groundnut.webp'
import castor from '@admin/_assets/products/castor.webp'
import combo from '@admin/_assets/products/combo.webp'
import mayil from '@admin/_assets/products/mayil.webp'
import jothi from '@admin/_assets/products/jothi.webp'
import sesame from '@admin/_assets/products/reshmam-sesame.webp'

export const SEED_VERSION = 6
// Static image imports resolve to { src, width, height }; the store keeps plain URL strings.
export const productImages = Object.fromEntries(
  Object.entries({ coconut, gingelly, groundnut, castor, combo, mayil, jothi, sesame }).map(([k, img]) => [k, img.src]),
)

export const CATEGORIES = ['Gingelly Oil', 'Coconut Oil', 'Groundnut Oil', 'Castor Oil', 'Combo Packs', 'Cattle Feed']
export const BRANDS = ['Velum Mayilum', 'Reshmam', 'Mayil', 'Jothi']
export const UNIT_TYPES = ['Bottle', 'Can', 'Pouch', 'Pack', 'Bag', 'Jar']
export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned']
export const PAYMENT_STATUSES = ['Paid', 'Pending', 'Failed', 'Refunded', 'Partially Refunded']
export const PAYMENT_METHODS = ['UPI (Razorpay)', 'Card (Razorpay)', 'Net Banking (Razorpay)', 'Cash on Delivery']
export const STOCK_MOVEMENT_TYPES = ['Stock In', 'Stock Out', 'Purchase Entry', 'Adjustment', 'Damaged', 'Transfer In', 'Transfer Out', 'Order', 'Return']
export const PERMISSION_MODULES = ['dashboard', 'products', 'categories', 'brands', 'orders', 'prices', 'inventory', 'branches', 'customers', 'marketing', 'whatsapp', 'chatbot', 'reports', 'settings']

// ---------- deterministic random ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000

export function buildSeed(now = Date.now()) {
  const rand = mulberry32(20261029)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1))
  const ago = (days, hour = int(8, 20)) => {
    const d = new Date(now - days * DAY); d.setHours(hour, int(0, 59), int(0, 59), 0)
    return Math.min(d.getTime(), now - 60000)
  }
  const iso = (t) => new Date(t).toISOString()
  const mrpOf = (p) => Math.ceil((p * 1.12) / 5) * 5

  // ---------- branches ----------
  const branches = [
    { id: 'br_vm', name: 'Velum Mayilum – Main Branch', code: 'VM001', address: '6/104 Main Road, Lakshmipuram', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628502', phone: '+91 98765 43210', email: 'info.peekaesons@gmail.com', manager: 'Murugan K', status: 'Active', createdAt: iso(ago(720)) },
    { id: 'br_rs', name: 'Reshmam – Sub Branch', code: 'RS001', address: 'Main Bazaar Road', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628501', phone: '+91 97877 22272', email: 'info.peekaesons@gmail.com', manager: 'Lakshmi P', status: 'Active', createdAt: iso(ago(540)) },
    { id: 'br_cf', name: 'Cattle Feed Branch', code: 'CF001', address: 'Ettayapuram Road', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628502', phone: '+91 98765 43210', email: 'info.peekaesons@gmail.com', manager: 'Selvam R', status: 'Active', createdAt: iso(ago(400)) },
  ]

  // ---------- categories & brands ----------
  const categories = [
    { id: 'cat_gin', name: 'Gingelly Oil', slug: 'gingelly-oil', description: 'Traditional chekku-pressed sesame oil', status: 'Active', order: 1, createdAt: iso(ago(700)) },
    { id: 'cat_coc', name: 'Coconut Oil', slug: 'coconut-oil', description: 'Wood-pressed coconut oil from sun-dried copra', status: 'Active', order: 2, createdAt: iso(ago(700)) },
    { id: 'cat_grn', name: 'Groundnut Oil', slug: 'groundnut-oil', description: 'Cold-pressed peanut oil with natural aroma', status: 'Active', order: 3, createdAt: iso(ago(700)) },
    { id: 'cat_cas', name: 'Castor Oil', slug: 'castor-oil', description: 'Pure cold-pressed castor oil', status: 'Active', order: 4, createdAt: iso(ago(700)) },
    { id: 'cat_cmb', name: 'Combo Packs', slug: 'combo-packs', description: 'Value packs & festival gift boxes', status: 'Active', order: 5, createdAt: iso(ago(700)) },
    { id: 'cat_cf', name: 'Cattle Feed', slug: 'cattle-feed', description: 'Rotary gingelly oil cake for cattle nutrition', status: 'Active', order: 6, createdAt: iso(ago(700)) },
  ]

  const brands = [
    { id: 'brd_vm', name: 'Velum Mayilum', slug: 'velum-mayilum', description: 'Our heritage brand since 1968', status: 'Active', order: 1, createdAt: iso(ago(720)) },
    { id: 'brd_rs', name: 'Reshmam', slug: 'reshmam', description: 'Premium cold pressed oils', status: 'Active', order: 2, createdAt: iso(ago(540)) },
    { id: 'brd_my', name: 'Mayil', slug: 'mayil', description: 'Standard quality oils & oil cakes', status: 'Active', order: 3, createdAt: iso(ago(600)) },
    { id: 'brd_jt', name: 'Jothi', slug: 'jothi', description: 'Special rotary sesame cake', status: 'Active', order: 4, createdAt: iso(ago(600)) },
  ]

  // ---------- products + branch-wise variants ----------
  // [id, name, sku, category, brand, hsn, gst, image, unitType, description, variants: [branchId, size, price, stock, alert, mrp?]]
  const P = [
    ['p_vm_coc', 'Pure Coconut Oil', 'VM-COC', 'Coconut Oil', 'Velum Mayilum', '1513', 5, 'coconut', 'Bottle',
      'Wood-pressed coconut oil from sun-dried copra, filtered naturally without chemicals. Suitable for cooking and hair care.',
      [['br_vm', '200 ml', 75, 500, 50, 85], ['br_vm', '500 ml', 150, 400, 40, 170], ['br_vm', '1 L', 270, 350, 35, 300], ['br_rs', '500 ml', 155, 120, 20], ['br_rs', '1 L', 280, 60, 15]]],
    ['p_vm_gin', 'Premium Gingelly Oil', 'VM-GIN', 'Gingelly Oil', 'Velum Mayilum', '1515', 5, 'gingelly', 'Bottle',
      'Traditional chekku-pressed gingelly (sesame) oil from quality sesame seeds and palm jaggery, as practised in Tamil Nadu.',
      [['br_vm', '200 ml', 95, 260, 40], ['br_vm', '500 ml', 180, 210, 40], ['br_vm', '1 L', 340, 140, 30], ['br_rs', '1 L', 350, 12, 15]]],
    ['p_vm_grn', 'Groundnut Oil', 'VM-GRN', 'Groundnut Oil', 'Velum Mayilum', '1508', 5, 'groundnut', 'Bottle',
      'Cold-pressed groundnut oil with natural aroma, ideal for everyday South Indian cooking and frying.',
      [['br_vm', '500 ml', 120, 300, 40], ['br_vm', '1 L', 230, 180, 30], ['br_vm', '5 L', 1100, 24, 8]]],
    ['p_rs_gin', 'Traditional Cold Pressed Gingelly Oil', 'RS-GIN', 'Gingelly Oil', 'Reshmam', '1515', 5, 'gingelly', 'Bottle',
      'Reshmam traditional cold-pressed gingelly oil, slowly extracted in wooden chekku at low temperature.',
      [['br_rs', '500 ml', 350, 120, 25], ['br_rs', '1 L', 600, 90, 20], ['br_rs', '5 L', 950, 25, 8]]],
    ['p_rs_grn', 'Traditional Cold Pressed Groundnut Oil', 'RS-GRN', 'Groundnut Oil', 'Reshmam', '1508', 5, 'groundnut', 'Bottle',
      'Reshmam groundnut oil pressed from select peanuts in a traditional wooden press.',
      [['br_rs', '500 ml', 300, 140, 25], ['br_rs', '1 L', 550, 100, 20], ['br_rs', '5 L', 850, 30, 8]]],
    ['p_rs_coc', 'Traditional Cold Pressed Coconut Oil', 'RS-COC', 'Coconut Oil', 'Reshmam', '1513', 5, 'coconut', 'Bottle',
      'Reshmam coconut oil from sun-dried copra, unrefined and naturally filtered.',
      [['br_rs', '500 ml', 320, 110, 25], ['br_rs', '1 L', 580, 80, 20], ['br_rs', '5 L', 900, 6, 8]]],
    ['p_rs_cas', 'Traditional Cold Pressed Castor Oil', 'RS-CAS', 'Castor Oil', 'Reshmam', '1515', 5, 'castor', 'Bottle',
      'Cold-pressed castor oil for external use and traditional household needs.',
      [['br_rs', '500 ml', 280, 60, 15], ['br_rs', '1 L', 450, 40, 10], ['br_rs', '5 L', 700, 0, 5]]],
    ['p_rs_ses', 'RESHMAM Sesame Oil', 'RS-SES', 'Gingelly Oil', 'Reshmam', '1515', 5, 'sesame', 'Bottle',
      'RESHMAM branded sesame oil in a 500 ml bottle.',
      [['br_rs', '500 ml', 160, 100, 20], ['br_vm', '500 ml', 165, 45, 15]]],
    ['p_rs_ginfp', 'Gingelly Oil Family Pack', 'RS-GIN-FP', 'Gingelly Oil', 'Reshmam', '1515', 5, 'gingelly', 'Can',
      'Value family pack of traditional gingelly oil.',
      [['br_rs', '1 L x 2', 650, 50, 10], ['br_rs', '5 L', 1800, 15, 5]]],
    ['p_rs_grnfp', 'Groundnut Oil Family Pack', 'RS-GRN-FP', 'Groundnut Oil', 'Reshmam', '1508', 5, 'groundnut', 'Can',
      'Value family pack of traditional groundnut oil.',
      [['br_rs', '1 L x 2', 600, 50, 10], ['br_rs', '5 L', 1650, 4, 5]]],
    ['p_rs_cocfp', 'Coconut Oil Family Pack', 'RS-COC-FP', 'Coconut Oil', 'Reshmam', '1513', 5, 'coconut', 'Can',
      'Value family pack of traditional coconut oil.',
      [['br_rs', '1 L x 2', 650, 40, 10], ['br_rs', '5 L', 1750, 12, 5]]],
    ['p_rs_combo', 'Combo Oil Gift Pack', 'RS-COMBO', 'Combo Packs', 'Reshmam', '1515', 5, 'combo', 'Pack',
      'Gift pack with gingelly, groundnut, coconut and castor oil.',
      [['br_rs', '500 ml x 4', 1200, 30, 8], ['br_rs', '1 L x 4', 2300, 20, 5]]],
    ['p_cf_mayil', 'Mayil Rotary Gingelly Oil Cake', 'CF-MAYIL', 'Cattle Feed', 'Mayil', '2306', 5, 'mayil', 'Bag',
      'Rotary gingelly oil cake cattle feed in 50 kg bags from the Velum Mayilum mill.',
      [['br_cf', '50 kg', 1800, 40, 10], ['br_vm', '50 kg', 1800, 8, 10]]],
    ['p_cf_jothi', 'Jothi Rotary Gingelly Oil Cake', 'CF-JOTHI', 'Cattle Feed', 'Jothi', '2306', 5, 'jothi', 'Bag',
      'Rotary gingelly oil cake cattle feed in 50 kg bags.',
      [['br_cf', '50 kg', 1850, 40, 10]]],
  ]

  const products = []
  const variants = []
  P.forEach(([id, name, sku, category, brand, hsn, gst, img, unitType, description, vs], i) => {
    products.push({
      id, name, sku, category, brand, hsn, gst, unitType, description,
      images: [productImages[img]], primaryImage: 0,
      status: 'Active', featured: i < 4,
      createdAt: iso(ago(380 - i * 9)), updatedAt: iso(ago(20 - i)),
    })
    vs.forEach(([branchId, size, price, stock, alertStock, mrp]) => {
      const code = size.replace(/\s+/g, '').toUpperCase()
      variants.push({
        id: `v_${id.slice(2)}_${branchId.slice(3)}_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        productId: id, branchId, size, unitType, sku: `${sku}-${branchId.slice(3).toUpperCase()}-${code}`,
        price, mrp: mrp ?? mrpOf(price), stock, alertStock, status: 'Active',
      })
    })
  })
  products.find((p) => p.id === 'p_rs_ginfp').status = 'Inactive'

  // ---------- customers ----------
  const first = ['Arun', 'Priya', 'Karthik', 'Meena', 'Suresh', 'Divya', 'Ramesh', 'Kavitha', 'Vignesh', 'Anitha', 'Senthil', 'Revathi', 'Balaji', 'Sangeetha', 'Manikandan', 'Lakshmi', 'Prakash', 'Deepa', 'Ganesh', 'Malathi', 'Saravanan', 'Gayathri', 'Rajesh', 'Nandhini', 'Mohan', 'Sowmya', 'Kumar', 'Bharathi', 'Dinesh', 'Janani', 'Murali', 'Pavithra', 'Selvi', 'Hari', 'Uma', 'Ashok', 'Keerthana', 'Velu', 'Indhu', 'Siva', 'Radha', 'Naveen', 'Sathya', 'Gopal', 'Vasanthi']
  const last = ['Kumar', 'Raj', 'Murugan', 'Subramanian', 'Pandian', 'Krishnan', 'Natarajan', 'Selvam', 'Ramasamy', 'Shankar', 'Venkatesh', 'Perumal']
  const places = [['Kovilpatti', 'Tamil Nadu', '628501'], ['Tirunelveli', 'Tamil Nadu', '627001'], ['Thoothukudi', 'Tamil Nadu', '628001'], ['Madurai', 'Tamil Nadu', '625001'], ['Sivakasi', 'Tamil Nadu', '626123'], ['Virudhunagar', 'Tamil Nadu', '626001'], ['Chennai', 'Tamil Nadu', '600040'], ['Coimbatore', 'Tamil Nadu', '641002'], ['Sankarankovil', 'Tamil Nadu', '627756'], ['Ettayapuram', 'Tamil Nadu', '628902'], ['Bengaluru', 'Karnataka', '560034'], ['Kochi', 'Kerala', '682016']]
  const streets = ['North Car Street', 'Gandhi Nagar', 'Anna Salai', 'Main Road', 'Bazaar Street', 'Kamaraj Nagar', 'Nehru Street', 'Thiru Vi Ka Street', 'Periyar Nagar', 'Market Road']
  const customers = Array.from({ length: 90 }, (_, i) => {
    const f = first[i % first.length]
    const l = last[(i + Math.floor(i / first.length) * 5) % last.length]
    const [city, state, pincode] = places[i < 30 ? i % 6 : int(0, places.length - 1)]
    const regAgo = i < 62 ? int(45, 420) : int(0, 44)
    return {
      id: `c_${String(i + 1).padStart(3, '0')}`,
      name: `${f} ${l}`,
      phone: `+91 9${int(0, 9)}${int(100, 999)} ${int(10000, 99999)}`,
      email: i % 11 === 10 ? '' : `${f.toLowerCase()}.${l.toLowerCase()}${i >= first.length ? i : ''}@example.com`,
      address: { line1: `${int(1, 120)}, ${pick(streets)}`, line2: '', city, state, pincode },
      status: i % 17 === 16 ? 'Inactive' : 'Active',
      tags: i % 7 === 0 ? ['Wholesale'] : [],
      notes: i % 7 === 0 ? 'Buys cattle feed in bulk for the dairy farm.' : '',
      whatsappOptIn: rand() > 0.2,
      createdAt: iso(ago(regAgo)),
      _w: i % 9 === 0 ? 7 : i % 4 === 0 ? 3 : 1,
    }
  })
  const pickCustomer = (t, wholesale) => {
    let pool = customers.filter((c) => new Date(c.createdAt).getTime() <= t && (!wholesale || c.tags.includes('Wholesale')))
    if (!pool.length) pool = customers.filter((c) => new Date(c.createdAt).getTime() <= t)
    if (!pool.length) pool = customers
    const total = pool.reduce((s, c) => s + c._w, 0)
    let r = rand() * total
    for (const c of pool) { r -= c._w; if (r <= 0) return c }
    return pool[pool.length - 1]
  }

  // ---------- orders ----------
  const variantsByBranch = (bid) => variants.filter((v) => v.branchId === bid && v.stock > 0)
  const productOf = Object.fromEntries(products.map((p) => [p.id, p]))
  const orders = []
  const N = 360
  // Gentle growth curve: more orders in recent months.
  const ages = Array.from({ length: N }, () => Math.floor(Math.pow(rand(), 1.35) * 365)).sort((a, b) => b - a)
  ages.forEach((age, i) => {
    const r = rand()
    const branchId = r < 0.46 ? 'br_vm' : r < 0.86 ? 'br_rs' : 'br_cf'
    const created = ago(age)
    const cust = pickCustomer(created, branchId === 'br_cf')
    const pool = variantsByBranch(branchId)
    const nItems = branchId === 'br_cf' ? 1 : int(1, 3)
    const items = []
    for (let k = 0; k < nItems; k++) {
      const v = pick(pool)
      if (items.some((x) => x.variantId === v.id)) continue
      const p = productOf[v.productId]
      const qty = branchId === 'br_cf' ? int(1, 5) : int(1, 3)
      items.push({ productId: p.id, variantId: v.id, name: p.name, size: v.size, sku: v.sku, qty, price: v.price, mrp: v.mrp, gst: p.gst, total: v.price * qty })
    }
    const subtotal = items.reduce((s, x) => s + x.total, 0)
    const inTN = cust.address.state === 'Tamil Nadu'
    const shipping = subtotal >= 1499 ? 0 : inTN ? 60 : 120
    const discount = rand() < 0.18 ? Math.round(subtotal * pick([0.05, 0.1])) : 0
    const total = subtotal + shipping - discount
    const tax = orderGst({ items, subtotal, discount })
    const method = rand() < 0.3 ? 'Cash on Delivery' : pick(PAYMENT_METHODS.slice(0, 3))
    const cod = method === 'Cash on Delivery'
    let status
    if (age <= 1) status = pick(['Pending', 'Pending', 'Processing'])
    else if (age <= 3) status = pick(['Processing', 'Shipped', 'Pending'])
    else if (age <= 7) status = pick(['Shipped', 'Delivered', 'Delivered'])
    else status = rand() < 0.05 ? 'Cancelled' : rand() < 0.035 ? 'Returned' : 'Delivered'
    let paymentStatus = cod ? (status === 'Delivered' || status === 'Returned' ? 'Paid' : 'Pending') : 'Paid'
    if (!cod && status === 'Cancelled') paymentStatus = rand() < 0.4 ? 'Failed' : 'Refunded'
    if (status === 'Returned') paymentStatus = 'Refunded'
    if (cod && status === 'Cancelled') paymentStatus = 'Pending'
    const flow = ['Pending', 'Processing', 'Shipped', 'Delivered']
    const timeline = [{ status: 'Pending', note: 'Order placed', at: iso(created), by: 'Customer' }]
    const reach = status === 'Cancelled' ? int(0, 1) : status === 'Returned' ? 3 : flow.indexOf(status)
    for (let s = 1; s <= reach; s++) timeline.push({ status: flow[s], note: ['', 'Payment confirmed, packing started', 'Handed over to courier', 'Delivered to customer'][s], at: iso(Math.min(created + s * int(18, 40) * 3600000, now - 60000)), by: 'Admin' })
    if (status === 'Cancelled') timeline.push({ status: 'Cancelled', note: pick(['Customer requested cancellation', 'Payment not completed', 'Address not serviceable']), at: iso(Math.min(created + 5 * 3600000, now - 60000)), by: 'Admin' })
    if (status === 'Returned') timeline.push({ status: 'Returned', note: 'Return received — damaged in transit', at: iso(Math.min(created + 6 * DAY, now - 60000)), by: 'Admin' })
    const refund = paymentStatus === 'Refunded' ? { amount: total, reason: status === 'Returned' ? 'Product damaged in transit' : 'Order cancelled', status: 'Processed', refId: `rfnd_${Math.floor(rand() * 1e12).toString(36)}`, at: timeline[timeline.length - 1].at } : null
    orders.push({
      id: `o_${i + 1}`,
      number: `RSH-${10001 + i}`,
      customerId: cust.id, customerName: cust.name, customerPhone: cust.phone, customerEmail: cust.email,
      shippingAddress: cust.address,
      branchId, items, subtotal, shipping, discount, tax, total,
      couponCode: discount ? (discount / subtotal > 0.07 ? 'WELCOME10' : 'FESTIVE5') : '',
      paymentMethod: method,
      paymentId: cod ? '' : `pay_${Math.floor(rand() * 1e14).toString(36)}`,
      paymentStatus, status, timeline, refund,
      stockDeducted: ['Processing', 'Shipped', 'Delivered'].includes(status),
      trackingNumber: ['Shipped', 'Delivered', 'Returned'].includes(status) ? `ST${int(100000000, 999999999)}` : '',
      courier: ['Shipped', 'Delivered', 'Returned'].includes(status) ? pick(['Professional Couriers', 'ST Courier', 'India Post', 'DTDC']) : '',
      notes: '',
      createdAt: iso(created), updatedAt: timeline[timeline.length - 1].at,
    })
  })

  // ---------- stock movements & price history ----------
  const stockMovements = []
  variants.forEach((v, i) => {
    const p = productOf[v.productId]
    const opening = v.stock + int(30, 140)
    stockMovements.push({ id: `sm_${i}_a`, variantId: v.id, productId: v.productId, branchId: v.branchId, type: 'Purchase Entry', qty: opening, balance: opening, reference: `PO-${2400 + i}`, notes: `Opening stock for ${p.name} ${v.size}`, user: 'Admin', date: iso(ago(60 + int(0, 20))) })
    stockMovements.push({ id: `sm_${i}_b`, variantId: v.id, productId: v.productId, branchId: v.branchId, type: 'Order', qty: -(opening - v.stock), balance: v.stock, reference: 'Online orders', notes: 'Stock out against delivered orders', user: 'System', date: iso(ago(int(1, 6))) })
  })
  stockMovements.push(
    { id: 'sm_x1', variantId: 'v_rs_cas_rs_5l', productId: 'p_rs_cas', branchId: 'br_rs', type: 'Damaged', qty: -3, balance: 0, reference: 'DMG-102', notes: 'Cans leaked during unloading', user: 'Lakshmi P', date: iso(ago(4)) },
    { id: 'sm_x2', variantId: 'v_vm_gin_rs_1l', productId: 'p_vm_gin', branchId: 'br_rs', type: 'Transfer In', qty: 12, balance: 12, reference: 'TRF-0007', notes: 'From Velum Mayilum – Main Branch', user: 'Murugan K', date: iso(ago(9)) },
  )
  const priceHistory = [
    { id: 'ph_1', variantId: 'v_vm_coc_vm_1l', productId: 'p_vm_coc', branchId: 'br_vm', size: '1 L', oldPrice: 260, newPrice: 270, oldMrp: 290, newMrp: 300, note: 'Copra price increase', user: 'Admin', date: iso(ago(45)) },
    { id: 'ph_2', variantId: 'v_vm_coc_vm_500ml', productId: 'p_vm_coc', branchId: 'br_vm', size: '500 ml', oldPrice: 145, newPrice: 150, oldMrp: 165, newMrp: 170, note: 'Copra price increase', user: 'Admin', date: iso(ago(45)) },
    { id: 'ph_3', variantId: 'v_vm_gin_vm_1l', productId: 'p_vm_gin', branchId: 'br_vm', size: '1 L', oldPrice: 360, newPrice: 340, oldMrp: 390, newMrp: 380, note: 'Festive season price', user: 'Admin', date: iso(ago(18)) },
    { id: 'ph_4', variantId: 'v_cf_mayil_cf_50kg', productId: 'p_cf_mayil', branchId: 'br_cf', size: '50 kg', oldPrice: 1750, newPrice: 1800, oldMrp: 1960, newMrp: 2020, note: 'Sesame seed cost revision', user: 'Selvam R', date: iso(ago(30)) },
  ]

  // ---------- marketing ----------
  const coupons = [
    { id: 'cp_1', code: 'WELCOME10', description: '10% off on first order', type: 'Percentage', value: 10, minOrder: 499, maxDiscount: 200, usageLimit: 500, used: orders.filter((o) => o.couponCode === 'WELCOME10').length, validFrom: iso(ago(200)).slice(0, 10), validTo: iso(now + 60 * DAY).slice(0, 10), status: 'Active' },
    { id: 'cp_2', code: 'FESTIVE5', description: '5% off during festival season', type: 'Percentage', value: 5, minOrder: 999, maxDiscount: 300, usageLimit: 1000, used: orders.filter((o) => o.couponCode === 'FESTIVE5').length, validFrom: iso(ago(40)).slice(0, 10), validTo: iso(now + 20 * DAY).slice(0, 10), status: 'Active' },
    { id: 'cp_3', code: 'FLAT100', description: '₹100 off on orders above ₹1,500', type: 'Flat', value: 100, minOrder: 1500, maxDiscount: 100, usageLimit: 200, used: 0, validFrom: iso(now + 5 * DAY).slice(0, 10), validTo: iso(now + 45 * DAY).slice(0, 10), status: 'Scheduled' },
    { id: 'cp_4', code: 'PONGAL15', description: 'Pongal offer (last season)', type: 'Percentage', value: 15, minOrder: 799, maxDiscount: 250, usageLimit: 300, used: 0, validFrom: iso(ago(300)).slice(0, 10), validTo: iso(ago(280)).slice(0, 10), status: 'Expired' },
  ]
  const campaigns = [
    { id: 'cm_1', name: 'Deepavali Gingelly Oil Offer', channel: 'WhatsApp', audience: 'All opted-in customers', templateId: 'wt_offer', scheduledAt: iso(ago(12)), status: 'Completed', recipients: 38, notes: 'Sample campaign record' },
    { id: 'cm_2', name: 'Cattle feed restock notice', channel: 'WhatsApp', audience: 'Wholesale customers', templateId: 'wt_offer', scheduledAt: iso(now + 3 * DAY), status: 'Scheduled', recipients: 7, notes: '' },
    { id: 'cm_3', name: 'Winter hair-care with coconut oil', channel: 'Email', audience: 'Repeat customers', templateId: '', scheduledAt: '', status: 'Draft', recipients: 0, notes: '' },
  ]
  const banners = [
    { id: 'bn_1', title: 'Traditional Cold Pressed Oils', subtitle: 'Pure. Traditional. Trusted.', link: '/products', position: 'Home – Hero', status: 'Active', image: productImages.combo, order: 1 },
    { id: 'bn_2', title: 'Cattle Feed – Oil Cakes', subtitle: 'Mayil & Jothi rotary gingelly oil cake', link: '/products?category=cattle-feed', position: 'Products – Top', status: 'Inactive', image: productImages.mayil, order: 2 },
  ]
  const blogs = [
    {
      id: 'bl_1',
      slug: 'why-wooden-chekku-cold-pressed-oils-matter',
      title: 'Why Traditional Wooden Chekku Cold-Pressed Oils Matter',
      category: 'Oil Education',
      date: iso(ago(5)).slice(0, 10),
      author: 'RESHMAM Editorial',
      excerpt: 'How slow wooden chekku pressing keeps natural aroma, antioxidants, and nutrients intact without chemical solvents.',
      image: '/images/story-hero.webp',
      imageAlt: 'Traditional wooden chekku oil press filled with sesame seeds',
      content: 'Cold-pressed oils are extracted mechanically at low temperatures rather than with high heat or chemical solvents.\n\n## The Wooden Chekku Method\nIn a traditional wooden chekku, a slow-turning pestle presses select sesame seeds, groundnuts, or sun-dried copra gently so friction heat stays low.\n\n## Everyday Kitchen Benefits\n- Retains the natural aroma and colour of the seed\n- Free from hexane, bleaching agents, and artificial preservatives\n- Ideal for South Indian tempering, sautéing, and daily nutrition',
      status: 'Published',
      createdAt: iso(ago(5)),
    },
  ]
  const testimonials = [
    {
      id: 'ts_1',
      name: 'Meenakshi Sundaram',
      rating: 5,
      product: 'Traditional Cold Pressed Gingelly Oil',
      text: 'The rich aroma and authentic taste remind me of traditional home-pressed gingelly oil. Delivery to Madurai was quick and the bottles arrived securely packed.',
      avatar: '',
      order: 1,
      status: 'Active',
      createdAt: iso(ago(7)),
    },
  ]

  // ---------- WhatsApp ----------
  const whatsapp = {
    config: { enabled: false, phoneNumberId: '', wabaId: '', businessPhone: '', accessToken: '', apiVersion: 'v21.0', webhookUrl: 'https://<your-backend>/api/whatsapp/webhook', verifyToken: '', status: 'Not connected', lastChecked: '' },
    templates: [
      { id: 'wt_order_conf', name: 'order_confirmation', type: 'Utility', language: 'English', status: 'Approved', header: 'Order Confirmed', body: 'Hi {{customer_name}}, thank you for your order {{order_id}} of {{order_total}} from RESHMAM. We will notify you once it ships.', footer: 'RESHMAM – Natural Goodness', buttons: ['View Order'], updatedAt: iso(ago(30)) },
      { id: 'wt_shipped', name: 'order_shipped', type: 'Utility', language: 'English', status: 'Approved', header: 'Order Shipped', body: 'Hi {{customer_name}}, your order {{order_id}} has been shipped. Track it here: {{tracking_link}}', footer: 'RESHMAM – Natural Goodness', buttons: ['Track Order'], updatedAt: iso(ago(30)) },
      { id: 'wt_delivered', name: 'order_delivered', type: 'Utility', language: 'English', status: 'Approved', header: 'Delivered', body: 'Hi {{customer_name}}, your order {{order_id}} has been delivered. Thank you for choosing RESHMAM!', footer: '', buttons: [], updatedAt: iso(ago(30)) },
      { id: 'wt_payment', name: 'payment_reminder', type: 'Utility', language: 'English', status: 'Approved', header: '', body: 'Hi {{customer_name}}, payment of {{order_total}} for order {{order_id}} is pending. Complete it here: {{payment_link}}', footer: '', buttons: ['Pay Now'], updatedAt: iso(ago(25)) },
      { id: 'wt_cart', name: 'abandoned_cart', type: 'Marketing', language: 'English', status: 'Pending', header: '', body: 'Hi {{customer_name}}, you left {{product_name}} in your cart. Complete your order today!', footer: 'Reply STOP to opt out', buttons: ['Complete Order'], updatedAt: iso(ago(6)) },
      { id: 'wt_welcome', name: 'welcome_message', type: 'Marketing', language: 'Tamil', status: 'Approved', header: '', body: 'வணக்கம் {{customer_name}}! RESHMAM குடும்பத்திற்கு வரவேற்கிறோம்.', footer: '', buttons: ['Shop Now'], updatedAt: iso(ago(60)) },
      { id: 'wt_lowstock', name: 'low_stock_alert', type: 'Utility', language: 'English', status: 'Approved', header: 'Low Stock', body: 'Alert: {{product_name}} ({{branch_name}}) has only {{stock}} units left.', footer: '', buttons: [], updatedAt: iso(ago(40)) },
      { id: 'wt_followup', name: 'feedback_followup', type: 'Marketing', language: 'English', status: 'Rejected', header: '', body: 'Hi {{customer_name}}, how was your {{product_name}}? Reply to share your feedback.', footer: '', buttons: [], updatedAt: iso(ago(15)) },
      { id: 'wt_offer', name: 'festival_offer', type: 'Marketing', language: 'English', status: 'Approved', header: 'Festive Offer', body: 'Hi {{customer_name}}, enjoy {{discount}} off on RESHMAM oils with code {{coupon_code}}.', footer: 'Reply STOP to opt out', buttons: ['Shop Now'], updatedAt: iso(ago(14)) },
    ],
    automations: [
      { id: 'wa_1', key: 'order_confirmation', name: 'Order Confirmation', description: 'Sent when a new order is placed', templateId: 'wt_order_conf', enabled: true, delay: 0 },
      { id: 'wa_2', key: 'order_shipped', name: 'Order Shipped', description: 'Sent when order status changes to Shipped', templateId: 'wt_shipped', enabled: true, delay: 0 },
      { id: 'wa_3', key: 'order_delivered', name: 'Order Delivered', description: 'Sent when order status changes to Delivered', templateId: 'wt_delivered', enabled: true, delay: 0 },
      { id: 'wa_4', key: 'payment_reminder', name: 'Payment Reminder', description: 'Sent when payment is pending', templateId: 'wt_payment', enabled: false, delay: 60 },
      { id: 'wa_5', key: 'abandoned_cart', name: 'Abandoned Cart', description: 'Sent when a cart is left without checkout', templateId: 'wt_cart', enabled: false, delay: 180 },
      { id: 'wa_6', key: 'welcome', name: 'Welcome Message', description: 'Sent when a customer registers', templateId: 'wt_welcome', enabled: true, delay: 0 },
      { id: 'wa_7', key: 'low_stock', name: 'Low Stock Alert (to admin)', description: 'Sent to the admin number when stock falls below the alert level', templateId: 'wt_lowstock', enabled: true, delay: 0 },
      { id: 'wa_8', key: 'follow_up', name: 'Customer Follow-up', description: 'Sent a few days after delivery', templateId: 'wt_followup', enabled: false, delay: 4320 },
    ],
    logs: orders.slice(-14).reverse().map((o, i) => ({
      id: `wl_${i}`, phone: o.customerPhone, customer: o.customerName, template: o.status === 'Shipped' ? 'order_shipped' : o.status === 'Delivered' ? 'order_delivered' : 'order_confirmation',
      message: `Order ${o.number} update for ${o.customerName}`, date: o.updatedAt,
      status: i === 3 ? 'Failed' : i % 3 === 0 ? 'Sent' : i % 3 === 1 ? 'Delivered' : 'Read', error: i === 3 ? '131026 – Message undeliverable (sample)' : '', simulated: true,
    })),
  }

  // ---------- AI chatbot ----------
  const chatbot = {
    settings: { enabled: true, botName: 'Reshmam Assistant', welcome: 'Vanakkam! 🙏 I am the Reshmam Assistant. How can I help you today?', businessInfo: 'RESHMAM (P. Kaliappan and Sons), Kovilpatti, Tamil Nadu. Traditional cold-pressed gingelly, groundnut, coconut and castor oils, and gingelly oil cake cattle feed.', language: 'English + Tamil', tone: 'Friendly', handover: true, handoverKeywords: 'agent, human, call me, complaint', handoverMessage: 'Connecting you to our support team. They will reply shortly.', workingHours: 'Mon–Sat, 9:00 AM – 6:00 PM', provider: 'Not configured', model: '', apiKey: '', temperature: 0.3 },
    flows: [
      { id: 'f_welcome', name: 'Welcome', question: 'Customer starts a chat', response: 'Vanakkam! 🙏 Welcome to RESHMAM. What would you like help with?', buttons: ['Products', 'Track Order', 'Talk to Support'], keywords: ['hi', 'hello', 'vanakkam', 'start'], next: ['f_products', 'f_tracking', 'f_human'], enabled: true, x: 40, y: 200 },
      { id: 'f_products', name: 'Product Queries', question: 'What oils do you sell?', response: 'We offer cold-pressed Gingelly, Groundnut, Coconut and Castor oils, combo packs and gingelly oil cake cattle feed.', buttons: ['Price & Availability', 'Back'], keywords: ['product', 'oil', 'gingelly', 'coconut', 'groundnut', 'castor'], next: ['f_price'], enabled: true, x: 330, y: 40 },
      { id: 'f_price', name: 'Price & Availability', question: 'What is the price of 1 L coconut oil?', response: 'Prices depend on size and branch. I will fetch the latest price and stock for {{product_name}} from the catalogue.', buttons: ['Buy Now', 'Talk to Support'], keywords: ['price', 'cost', 'rate', 'available', 'stock'], next: ['f_payment'], enabled: true, x: 620, y: 40 },
      { id: 'f_tracking', name: 'Order Tracking', question: 'Where is my order?', response: 'Please share your Order ID (e.g. RSH-10234). I will check its current status.', buttons: ['Shipping Info', 'Talk to Support'], keywords: ['track', 'order', 'status', 'where'], next: ['f_shipping'], enabled: true, x: 330, y: 200 },
      { id: 'f_payment', name: 'Payment Assistance', question: 'My payment failed', response: 'If money was debited but the order is not confirmed, it is usually auto-reversed by your bank in 5–7 working days. Share your Order ID and we will check.', buttons: ['Talk to Support'], keywords: ['payment', 'upi', 'failed', 'debited', 'refund status'], next: ['f_human'], enabled: true, x: 910, y: 40 },
      { id: 'f_shipping', name: 'Shipping Info', question: 'How long does delivery take?', response: 'Orders are dispatched within 1–2 working days. Free delivery on orders above ₹1,499.', buttons: ['Return & Refund'], keywords: ['delivery', 'shipping', 'courier', 'days'], next: ['f_returns'], enabled: true, x: 620, y: 200 },
      { id: 'f_returns', name: 'Return & Refund', question: 'I received a damaged bottle', response: 'Sorry about that! Please share photos and your Order ID within 48 hours of delivery. Our team will arrange a replacement or refund as per our Returns policy.', buttons: ['Talk to Support'], keywords: ['return', 'refund', 'damaged', 'leak', 'replace'], next: ['f_human'], enabled: true, x: 910, y: 200 },
      { id: 'f_human', name: 'Human Support', question: 'I want to talk to someone', response: 'Connecting you to our support team. They will reply shortly during working hours.', buttons: [], keywords: ['agent', 'human', 'support', 'call', 'complaint'], next: [], enabled: true, x: 620, y: 370 },
    ],
    knowledge: [
      { id: 'kb_1', type: 'FAQ', question: 'What is cold-pressed oil?', answer: 'Oil extracted mechanically at low temperature in a wooden (chekku) or rotary press, without chemical solvents or refining.', fileName: '', size: 0, createdAt: iso(ago(50)) },
      { id: 'kb_2', type: 'FAQ', question: 'Do you offer free delivery?', answer: 'Yes, delivery is free on orders above ₹1,499. Below that, ₹60 within Tamil Nadu and ₹120 for the rest of India.', fileName: '', size: 0, createdAt: iso(ago(50)) },
      { id: 'kb_3', type: 'FAQ', question: 'How should I store the oil?', answer: 'Store in a cool, dry place away from direct sunlight and keep the cap tightly closed.', fileName: '', size: 0, createdAt: iso(ago(48)) },
      { id: 'kb_4', type: 'Product Info', question: 'Mayil Rotary Gingelly Oil Cake', answer: 'Cattle feed in 50 kg bags, available at the Cattle Feed Branch and Velum Mayilum – Main Branch.', fileName: '', size: 0, createdAt: iso(ago(40)) },
      { id: 'kb_5', type: 'Document', question: 'Shipping & Returns policy', answer: '', fileName: 'shipping-returns-policy.pdf', size: 184320, createdAt: iso(ago(35)) },
    ],
    conversations: customers.slice(0, 9).map((c, i) => {
      const t = ago(i * 1.3 + 0.1)
      const status = ['Open', 'Resolved', 'Handed over', 'Resolved', 'Pending', 'Resolved', 'Resolved', 'Handed over', 'Resolved'][i]
      const qs = [['What is the price of 1 L coconut oil?', 'Pure Coconut Oil 1 L is ₹270 at Velum Mayilum – Main Branch and in stock.'], ['Where is my order RSH-10340?', 'Your order RSH-10340 has been shipped via ST Courier.'], ['I received a leaking bottle', 'Sorry about that! Please share photos and your Order ID within 48 hours of delivery.'], ['Do you deliver to Bengaluru?', 'Yes, we deliver across India. Shipping is ₹120 outside Tamil Nadu, free above ₹1,499 within Tamil Nadu.'], ['Payment debited but order not confirmed', 'Please share your Order ID and we will check.'], ['Is gingelly oil cake available?', 'Yes, Mayil and Jothi rotary oil cakes are available in 50 kg bags.'], ['How to store the oil?', 'Store in a cool, dry place away from direct sunlight.'], ['I want to place a bulk order', 'Connecting you to our support team.'], ['Hi', 'Vanakkam! 🙏 Welcome to RESHMAM. What would you like help with?']][i]
      const messages = [
        { from: 'user', text: qs[0], at: iso(t) },
        { from: 'bot', text: qs[1], at: iso(t + 20000) },
      ]
      if (status === 'Handed over') messages.push({ from: 'bot', text: 'Connecting you to our support team. They will reply shortly.', at: iso(t + 40000) })
      if (status === 'Resolved' && i % 2) messages.push({ from: 'user', text: 'Thank you!', at: iso(t + 90000) })
      return { id: `cv_${i + 1}`, customerId: c.id, customer: c.name, phone: c.phone, channel: i % 3 === 0 ? 'Website' : 'WhatsApp', status, messages, startedAt: iso(t), updatedAt: messages[messages.length - 1].at, sample: true }
    }),
  }

  // ---------- settings / users / roles ----------
  const allPerms = (v) => Object.fromEntries(PERMISSION_MODULES.map((m) => [m, v]))
  const settings = {
    general: { storeName: 'RESHMAM Natural Goodness', storeUrl: 'https://reshmam.com', timezone: 'Asia/Kolkata', currency: 'INR', dateFormat: 'DD MMM YYYY', orderPrefix: 'RSH-', lowStockEmail: true, maintenance: false },
    company: { legalName: 'P. Kaliappan and Sons', brand: 'RESHMAM', tagline: 'Pure. Traditional. Trusted.', address: '6/104 Main Road, Lakshmipuram', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628502', phone: '+91 97877 22272', mobile: '97877 22272', email: 'info.peekaesons@gmail.com', gstin: '', fssai: '', logo: '' },
    notifications: { newOrder: true, lowStock: true, outOfStock: true, newCustomer: false, paymentFailed: true, refundRequest: true, dailySummary: false, channels: { email: true, whatsapp: false, inApp: true } },
    tax: { gstEnabled: true, defaultGst: 5, gstin: '', placeOfSupply: 'Tamil Nadu', invoicePrefix: 'INV-', hsnOnInvoice: true },
    payment: { razorpayEnabled: false, razorpayKeyId: '', razorpayMode: 'Test', webhookSecretSet: false, codEnabled: true, codMaxOrder: 5000, upiId: '' },
    shipping: { freeThreshold: 1499, tamilNaduFee: 60, restOfIndiaFee: 120, dispatchDays: '1–2 working days', couriers: 'Professional Couriers, ST Courier, India Post, DTDC', pickupAvailable: true },
    users: [
      { id: 'u_1', name: 'Reshmam Admin', email: 'admin@reshmam.com', password: 'Admin@123', role: 'Admin', branchId: 'all', phone: '+91 98765 43210', status: 'Active', lastLogin: '', avatar: '' },
      { id: 'u_2', name: 'Murugan K', email: 'manager@reshmam.com', password: 'Manager@123', role: 'Manager', branchId: 'br_vm', phone: '', status: 'Active', lastLogin: iso(ago(1)), avatar: '' },
      { id: 'u_3', name: 'Lakshmi P', email: 'staff@reshmam.com', password: 'Staff@123', role: 'Staff', branchId: 'br_rs', phone: '', status: 'Active', lastLogin: iso(ago(3)), avatar: '' },
      { id: 'u_4', name: 'Selvam R', email: 'selvam@reshmam.com', password: 'Staff@123', role: 'Staff', branchId: 'br_cf', phone: '', status: 'Inactive', lastLogin: iso(ago(40)), avatar: '' },
    ],
    roles: {
      Admin: { description: 'Full access to every module and setting', permissions: allPerms('manage') },
      Manager: { description: 'Runs day-to-day operations; cannot change system settings', permissions: { ...allPerms('manage'), settings: 'view', whatsapp: 'view', chatbot: 'view' } },
      Staff: { description: 'Handles orders and stock; read-only elsewhere', permissions: { ...allPerms('view'), orders: 'manage', inventory: 'manage', marketing: 'none', whatsapp: 'none', chatbot: 'none', settings: 'none', reports: 'none' } },
    },
  }

  customers.forEach((c) => delete c._w)
  const activities = [
    ...orders.slice(-8).reverse().map((o, i) => ({ id: `ac_o${i}`, type: 'order', message: `New order ${o.number} placed by ${o.customerName}`, user: 'Customer', at: o.createdAt })),
    { id: 'ac_1', type: 'price', message: 'Price updated: Premium Gingelly Oil 1 L (Velum Mayilum) ₹360 → ₹340', user: 'Admin', at: iso(ago(18)) },
    { id: 'ac_2', type: 'stock', message: 'Stock transfer TRF-0007: 12 × Premium Gingelly Oil 1 L to Reshmam – Sub Branch', user: 'Murugan K', at: iso(ago(9)) },
    { id: 'ac_3', type: 'stock', message: 'Damaged stock recorded: 3 × Castor Oil 5 L', user: 'Lakshmi P', at: iso(ago(4)) },
    { id: 'ac_4', type: 'customer', message: `New customer registered: ${customers[89].name}`, user: 'System', at: iso(ago(2)) },
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  return withIssuedInvoices({
    meta: { version: SEED_VERSION, seededAt: iso(now) },
    branches, products, variants, categories, brands, customers, orders, stockMovements, priceHistory,
    coupons, campaigns, banners, blogs, testimonials, whatsapp, chatbot, settings, activities,
    readNotifications: [],
  })
}

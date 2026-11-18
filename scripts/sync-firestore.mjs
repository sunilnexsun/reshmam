import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDWfC3Z-5nYzmDKIoLRwRCAkCQhIKQH8LI",
  authDomain: "reshmam-oil.firebaseapp.com",
  projectId: "reshmam-oil",
  storageBucket: "reshmam-oil.firebasestorage.app",
  messagingSenderId: "245127746311",
  appId: "1:245127746311:web:fb9041eea8686cb0e06ba2"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const now = new Date().toISOString()

// 1. Categories
const categories = [
  { id: 'cat_gin', name: 'Gingelly Oil', slug: 'gingelly-oil', description: 'Traditional chekku-pressed sesame oil', status: 'Active', order: 1, image: '/images/product-gingelly.webp', createdAt: now },
  { id: 'cat_coc', name: 'Coconut Oil', slug: 'coconut-oil', description: 'Wood-pressed coconut oil from sun-dried copra', status: 'Active', order: 2, image: '/images/product-coconut.webp', createdAt: now },
  { id: 'cat_grn', name: 'Groundnut Oil', slug: 'groundnut-oil', description: 'Cold-pressed peanut oil with natural aroma', status: 'Active', order: 3, image: '/images/product-groundnut.webp', createdAt: now },
  { id: 'cat_cas', name: 'Castor Oil', slug: 'castor-oil', description: 'Pure cold-pressed castor oil', status: 'Active', order: 4, image: '/images/product-castor.webp', createdAt: now },
  { id: 'cat_cmb', name: 'Combo Packs', slug: 'combo-packs', description: 'Value packs & festival gift boxes', status: 'Active', order: 5, image: '/images/product-combo.webp', createdAt: now },
  { id: 'cat_cf', name: 'Cattle Feed', slug: 'cattle-feed', description: 'Rotary gingelly oil cake for cattle nutrition', status: 'Active', order: 6, image: '/images/product-mayil.webp', createdAt: now },
]

// 2. Brands
const brands = [
  { id: 'brd_vm', name: 'Velum Mayilum', slug: 'velum-mayilum', description: 'Our heritage brand since 1968', status: 'Active', order: 1, logo: '/images/logo-mark.png', createdAt: now },
  { id: 'brd_rs', name: 'Reshmam', slug: 'reshmam', description: 'Premium cold pressed oils', status: 'Active', order: 2, logo: '/images/logo-mark.png', createdAt: now },
  { id: 'brd_my', name: 'Mayil', slug: 'mayil', description: 'Standard quality oils & oil cakes', status: 'Active', order: 3, logo: '/images/logo-mark.png', createdAt: now },
  { id: 'brd_jt', name: 'Jothi', slug: 'jothi', description: 'Special rotary sesame cake', status: 'Active', order: 4, logo: '/images/logo-mark.png', createdAt: now },
]

// 3. Branches
const branches = [
  { id: 'br_vm', name: 'Velum Mayilum – Main Branch', code: 'VM001', address: '6/104 Main Road, Lakshmipuram', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628502', phone: '+91 98765 43210', email: 'info.peekaesons@gmail.com', manager: 'Murugan K', status: 'Active', createdAt: now },
  { id: 'br_rs', name: 'Reshmam – Sub Branch', code: 'RS001', address: 'Main Bazaar Road', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628501', phone: '+91 97877 22272', email: 'info.peekaesons@gmail.com', manager: 'Lakshmi P', status: 'Active', createdAt: now },
  { id: 'br_cf', name: 'Cattle Feed Branch', code: 'CF001', address: 'Ettayapuram Road', city: 'Kovilpatti', state: 'Tamil Nadu', pincode: '628502', phone: '+91 98765 43210', email: 'info.peekaesons@gmail.com', manager: 'Selvam R', status: 'Active', createdAt: now },
]

// 4. Products & Variants
const products = [
  {
    id: 'p_vm_coc',
    name: 'Pure Coconut Oil',
    sku: 'VM-COC',
    category: 'Coconut Oil',
    brand: 'Velum Mayilum',
    hsn: '1513',
    gst: 5,
    unitType: 'Bottle',
    description: 'Wood-pressed coconut oil from sun-dried copra, filtered naturally without chemicals. Suitable for cooking and hair care.',
    status: 'Active',
    featured: true,
    primaryImage: 0,
    images: ['/images/product-coconut.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_vm_gin',
    name: 'Premium Gingelly Oil',
    sku: 'VM-GIN',
    category: 'Gingelly Oil',
    brand: 'Velum Mayilum',
    hsn: '1515',
    gst: 5,
    unitType: 'Bottle',
    description: 'Traditional chekku-pressed gingelly (sesame) oil from quality sesame seeds and palm jaggery, as practised in Tamil Nadu.',
    status: 'Active',
    featured: true,
    primaryImage: 0,
    images: ['/images/product-gingelly.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_vm_grn',
    name: 'Groundnut Oil',
    sku: 'VM-GRN',
    category: 'Groundnut Oil',
    brand: 'Velum Mayilum',
    hsn: '1508',
    gst: 5,
    unitType: 'Bottle',
    description: 'Cold-pressed groundnut oil with natural aroma, ideal for everyday South Indian cooking and frying.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/product-groundnut.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_gin',
    name: 'Traditional Cold Pressed Gingelly Oil',
    sku: 'RS-GIN',
    category: 'Gingelly Oil',
    brand: 'Reshmam',
    hsn: '1515',
    gst: 5,
    unitType: 'Bottle',
    description: 'Reshmam traditional cold-pressed gingelly oil, slowly extracted in wooden chekku at low temperature.',
    status: 'Active',
    featured: true,
    primaryImage: 0,
    images: ['/images/product-gingelly.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_grn',
    name: 'Traditional Cold Pressed Groundnut Oil',
    sku: 'RS-GRN',
    category: 'Groundnut Oil',
    brand: 'Reshmam',
    hsn: '1508',
    gst: 5,
    unitType: 'Bottle',
    description: 'Reshmam groundnut oil pressed from select peanuts in a traditional wooden press.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/product-groundnut.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_coc',
    name: 'Traditional Cold Pressed Coconut Oil',
    sku: 'RS-COC',
    category: 'Coconut Oil',
    brand: 'Reshmam',
    hsn: '1513',
    gst: 5,
    unitType: 'Bottle',
    description: 'Reshmam coconut oil from sun-dried copra, unrefined and naturally filtered.',
    status: 'Active',
    featured: true,
    primaryImage: 0,
    images: ['/images/product-coconut.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_cas',
    name: 'Traditional Cold Pressed Castor Oil',
    sku: 'RS-CAS',
    category: 'Castor Oil',
    brand: 'Reshmam',
    hsn: '1515',
    gst: 5,
    unitType: 'Bottle',
    description: 'Cold-pressed castor oil for external use and traditional household needs.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/product-castor.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_combo',
    name: 'Combo Oil Gift Pack',
    sku: 'RS-COMBO',
    category: 'Combo Packs',
    brand: 'Reshmam',
    hsn: '1515',
    gst: 5,
    unitType: 'Pack',
    description: 'Gift pack with gingelly, groundnut, coconut and castor oil.',
    status: 'Active',
    featured: true,
    primaryImage: 0,
    images: ['/images/product-combo.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_cf_mayil',
    name: 'Mayil Rotary Gingelly Oil Cake',
    sku: 'CF-MAYIL',
    category: 'Cattle Feed',
    brand: 'Mayil',
    hsn: '2306',
    gst: 5,
    unitType: 'Bag',
    description: 'Fresh rotary-pressed gingelly oil cake for cattle feed, rich in protein and nutrients.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/product-mayil.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_ses',
    name: 'RESHMAM Sesame Oil',
    sku: 'RS-SES',
    category: 'Gingelly Oil',
    brand: 'Reshmam',
    hsn: '1515',
    gst: 5,
    unitType: 'Bottle',
    description: 'RESHMAM branded sesame oil in a 500 ml bottle.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/reshmam-sesame-oil.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_ginfp',
    name: 'Gingelly Oil Family Pack',
    sku: 'RS-GIN-FP',
    category: 'Gingelly Oil',
    brand: 'Reshmam',
    hsn: '1515',
    gst: 5,
    unitType: 'Can',
    description: 'Value family pack of traditional gingelly oil.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/pack-gingelly.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_grnfp',
    name: 'Groundnut Oil Family Pack',
    sku: 'RS-GRN-FP',
    category: 'Groundnut Oil',
    brand: 'Reshmam',
    hsn: '1508',
    gst: 5,
    unitType: 'Can',
    description: 'Value family pack of traditional groundnut oil.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/pack-groundnut.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_rs_cocfp',
    name: 'Coconut Oil Family Pack',
    sku: 'RS-COC-FP',
    category: 'Coconut Oil',
    brand: 'Reshmam',
    hsn: '1513',
    gst: 5,
    unitType: 'Can',
    description: 'Value family pack of traditional coconut oil.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/pack-coconut.webp'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p_cf_jothi',
    name: 'Jothi Rotary Gingelly Oil Cake',
    sku: 'CF-JOTHI',
    category: 'Cattle Feed',
    brand: 'Jothi',
    hsn: '2306',
    gst: 5,
    unitType: 'Bag',
    description: 'Special rotary sesame cake for livestock feed.',
    status: 'Active',
    featured: false,
    primaryImage: 0,
    images: ['/images/product-mayil.webp'],
    createdAt: now,
    updatedAt: now,
  },
]

const variants = [
  { id: 'v_vm_coc_200ml', productId: 'p_vm_coc', branchId: 'br_vm', sku: 'VM-COC-VM-200ML', size: '200 ml', unitType: 'Bottle', price: 75, mrp: 85, stock: 500, alertStock: 50, status: 'Active' },
  { id: 'v_vm_coc_500ml', productId: 'p_vm_coc', branchId: 'br_vm', sku: 'VM-COC-VM-500ML', size: '500 ml', unitType: 'Bottle', price: 150, mrp: 170, stock: 400, alertStock: 40, status: 'Active' },
  { id: 'v_vm_coc_1l', productId: 'p_vm_coc', branchId: 'br_vm', sku: 'VM-COC-VM-1L', size: '1 L', unitType: 'Bottle', price: 270, mrp: 300, stock: 350, alertStock: 35, status: 'Active' },
  { id: 'v_vm_gin_200ml', productId: 'p_vm_gin', branchId: 'br_vm', sku: 'VM-GIN-VM-200ML', size: '200 ml', unitType: 'Bottle', price: 95, mrp: 110, stock: 260, alertStock: 40, status: 'Active' },
  { id: 'v_vm_gin_500ml', productId: 'p_vm_gin', branchId: 'br_vm', sku: 'VM-GIN-VM-500ML', size: '500 ml', unitType: 'Bottle', price: 180, mrp: 205, stock: 210, alertStock: 40, status: 'Active' },
  { id: 'v_vm_gin_1l', productId: 'p_vm_gin', branchId: 'br_vm', sku: 'VM-GIN-VM-1L', size: '1 L', unitType: 'Bottle', price: 340, mrp: 380, stock: 140, alertStock: 30, status: 'Active' },
  { id: 'v_rs_gin_500ml', productId: 'p_rs_gin', branchId: 'br_rs', sku: 'RS-GIN-RS-500ML', size: '500 ml', unitType: 'Bottle', price: 350, mrp: 395, stock: 120, alertStock: 25, status: 'Active' },
  { id: 'v_rs_gin_1l', productId: 'p_rs_gin', branchId: 'br_rs', sku: 'RS-GIN-RS-1L', size: '1 L', unitType: 'Bottle', price: 600, mrp: 675, stock: 90, alertStock: 20, status: 'Active' },
  { id: 'v_rs_grn_500ml', productId: 'p_rs_grn', branchId: 'br_rs', sku: 'RS-GRN-RS-500ML', size: '500 ml', unitType: 'Bottle', price: 300, mrp: 340, stock: 140, alertStock: 25, status: 'Active' },
  { id: 'v_rs_grn_1l', productId: 'p_rs_grn', branchId: 'br_rs', sku: 'RS-GRN-RS-1L', size: '1 L', unitType: 'Bottle', price: 550, mrp: 620, stock: 100, alertStock: 20, status: 'Active' },
  { id: 'v_rs_coc_500ml', productId: 'p_rs_coc', branchId: 'br_rs', sku: 'RS-COC-RS-500ML', size: '500 ml', unitType: 'Bottle', price: 320, mrp: 360, stock: 110, alertStock: 25, status: 'Active' },
  { id: 'v_rs_coc_1l', productId: 'p_rs_coc', branchId: 'br_rs', sku: 'RS-COC-RS-1L', size: '1 L', unitType: 'Bottle', price: 580, mrp: 650, stock: 80, alertStock: 20, status: 'Active' },
  { id: 'v_rs_cas_500ml', productId: 'p_rs_cas', branchId: 'br_rs', sku: 'RS-CAS-RS-500ML', size: '500 ml', unitType: 'Bottle', price: 280, mrp: 315, stock: 60, alertStock: 15, status: 'Active' },
  { id: 'v_rs_cas_1l', productId: 'p_rs_cas', branchId: 'br_rs', sku: 'RS-CAS-RS-1L', size: '1 L', unitType: 'Bottle', price: 450, mrp: 505, stock: 40, alertStock: 10, status: 'Active' },
  { id: 'v_rs_combo_500', productId: 'p_rs_combo', branchId: 'br_rs', sku: 'RS-COMBO-RS-500ML', size: '500 ml x 4', unitType: 'Pack', price: 1200, mrp: 1350, stock: 30, alertStock: 8, status: 'Active' },
  { id: 'v_cf_mayil_50kg', productId: 'p_cf_mayil', branchId: 'br_cf', sku: 'CF-MAYIL-CF-50KG', size: '50 kg', unitType: 'Bag', price: 1800, mrp: 2020, stock: 85, alertStock: 20, status: 'Active' },
]

// 5. Customers
const customers = [
  { id: 'c_1', name: 'Anand Kumar', email: 'anand.kumar@gmail.com', phone: '+91 98401 23456', address: { street: '12 Temple Street', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' }, totalOrders: 4, totalSpent: 3450, status: 'Active', createdAt: now },
  { id: 'c_2', name: 'Kavitha Ramesh', email: 'kavitha.r@yahoo.com', phone: '+91 97890 54321', address: { street: '45 Gandhi Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600028' }, totalOrders: 2, totalSpent: 1720, status: 'Active', createdAt: now },
  { id: 'c_3', name: 'Suresh Mani', email: 'suresh.mani@outlook.com', phone: '+91 94432 11223', address: { street: '8 Cross Cut Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641012' }, totalOrders: 5, totalSpent: 5200, status: 'Active', createdAt: now },
  { id: 'c_4', name: 'Meena Sundaram', email: 'meena.sundar@gmail.com', phone: '+91 98412 88990', address: { street: '21 Bazaar St', city: 'Tirunelveli', state: 'Tamil Nadu', pincode: '627001' }, totalOrders: 1, totalSpent: 890, status: 'Active', createdAt: now },
]

// 6. Orders
const orders = [
  {
    id: 'o_1',
    number: 'RSH-10001',
    customerId: 'c_1',
    customerName: 'Anand Kumar',
    customerEmail: 'anand.kumar@gmail.com',
    customerPhone: '+91 98401 23456',
    shippingAddress: { street: '12 Temple Street', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
    branchId: 'br_vm',
    items: [
      { variantId: 'v_vm_gin_1l', productId: 'p_vm_gin', name: 'Premium Gingelly Oil', size: '1 L', price: 340, qty: 2, subtotal: 680 },
      { variantId: 'v_vm_coc_1l', productId: 'p_vm_coc', name: 'Pure Coconut Oil', size: '1 L', price: 270, qty: 1, subtotal: 270 },
    ],
    subtotal: 950,
    shipping: 60,
    discount: 50,
    tax: 46,
    total: 1006,
    status: 'Delivered',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI (Razorpay)',
    stockDeducted: true,
    timeline: [
      { status: 'Pending', note: 'Order placed', at: now, by: 'Customer' },
      { status: 'Processing', note: 'Packing started', at: now, by: 'Admin' },
      { status: 'Shipped', note: 'Handed to ST Courier', at: now, by: 'Admin' },
      { status: 'Delivered', note: 'Delivered to customer', at: now, by: 'System' },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'o_2',
    number: 'RSH-10002',
    customerId: 'c_2',
    customerName: 'Kavitha Ramesh',
    customerEmail: 'kavitha.r@yahoo.com',
    customerPhone: '+91 97890 54321',
    shippingAddress: { street: '45 Gandhi Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600028' },
    branchId: 'br_rs',
    items: [
      { variantId: 'v_rs_gin_1l', productId: 'p_rs_gin', name: 'Traditional Cold Pressed Gingelly Oil', size: '1 L', price: 600, qty: 1, subtotal: 600 },
      { variantId: 'v_rs_coc_1l', productId: 'p_rs_coc', name: 'Traditional Cold Pressed Coconut Oil', size: '1 L', price: 580, qty: 1, subtotal: 580 },
    ],
    subtotal: 1180,
    shipping: 0,
    discount: 100,
    tax: 54,
    total: 1134,
    status: 'Processing',
    paymentStatus: 'Paid',
    paymentMethod: 'Card (Razorpay)',
    stockDeducted: true,
    timeline: [
      { status: 'Pending', note: 'Order placed', at: now, by: 'Customer' },
      { status: 'Processing', note: 'Order confirmed and packing', at: now, by: 'Admin' },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'o_3',
    number: 'RSH-10003',
    customerId: 'c_3',
    customerName: 'Suresh Mani',
    customerEmail: 'suresh.mani@outlook.com',
    customerPhone: '+91 94432 11223',
    shippingAddress: { street: '8 Cross Cut Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641012' },
    branchId: 'br_rs',
    items: [
      { variantId: 'v_rs_combo_500', productId: 'p_rs_combo', name: 'Combo Oil Gift Pack', size: '500 ml x 4', price: 1200, qty: 1, subtotal: 1200 },
    ],
    subtotal: 1200,
    shipping: 60,
    discount: 0,
    tax: 60,
    total: 1320,
    status: 'Pending',
    paymentStatus: 'Pending',
    paymentMethod: 'Cash on Delivery',
    stockDeducted: false,
    timeline: [
      { status: 'Pending', note: 'Order placed via Cash on Delivery', at: now, by: 'Customer' },
    ],
    createdAt: now,
    updatedAt: now,
  },
]

// 7. Price History
const priceHistory = [
  { id: 'ph_1', variantId: 'v_vm_gin_1l', productId: 'p_vm_gin', branchId: 'br_vm', size: '1 L', oldPrice: 360, newPrice: 340, oldMrp: 390, newMrp: 380, note: 'Copra & sesame revision', user: 'Admin', date: now },
  { id: 'ph_2', variantId: 'v_vm_coc_1l', productId: 'p_vm_coc', branchId: 'br_vm', size: '1 L', oldPrice: 260, newPrice: 270, oldMrp: 290, newMrp: 300, note: 'Market cost adjustment', user: 'Admin', date: now },
]

// 8. Stock Movements
const stockMovements = [
  { id: 'sm_1', variantId: 'v_vm_coc_1l', productId: 'p_vm_coc', branchId: 'br_vm', type: 'Purchase Entry', qty: 350, balance: 350, reference: 'PO-2026-01', notes: 'Initial stock intake', user: 'Admin', date: now },
  { id: 'sm_2', variantId: 'v_vm_gin_1l', productId: 'p_vm_gin', branchId: 'br_vm', type: 'Purchase Entry', qty: 140, balance: 140, reference: 'PO-2026-02', notes: 'Initial stock intake', user: 'Admin', date: now },
]

// 9. Coupons
const coupons = [
  { id: 'cp_welcome', code: 'WELCOME10', description: '10% off on first order', type: 'Percentage', value: 10, minOrder: 499, maxDiscount: 200, usageLimit: 500, used: 12, status: 'Active', validFrom: '2026-01-01', validTo: '2026-12-31' },
  { id: 'cp_festive', code: 'FESTIVE5', description: '5% festive discount', type: 'Percentage', value: 5, minOrder: 999, maxDiscount: 300, usageLimit: 1000, used: 34, status: 'Active', validFrom: '2026-01-01', validTo: '2026-12-31' },
]

export async function runSync() {
  console.log('Starting sync to Cloud Firestore ("reshmam-oil")...')

  const collections = [
    { name: 'categories', items: categories },
    { name: 'brands', items: brands },
    { name: 'branches', items: branches },
    { name: 'products', items: products },
    { name: 'variants', items: variants },
    { name: 'customers', items: customers },
    { name: 'orders', items: orders },
    { name: 'priceHistory', items: priceHistory },
    { name: 'stockMovements', items: stockMovements },
    { name: 'coupons', items: coupons },
  ]

  for (const { name, items } of collections) {
    console.log(`Writing ${items.length} records into collection "${name}"...`)
    for (const item of items) {
      const docRef = doc(db, name, String(item.id))
      await setDoc(docRef, item, { merge: true })
    }
  }

  console.log('✅ Successfully synced all collections to Firebase Firestore!')
}

if (process.argv[1]?.endsWith('sync-firestore.mjs')) {
  runSync().catch((err) => {
    console.error('❌ Sync failed:', err.message)
    if (err.code === 'permission-denied') {
      console.log('\n🔒 FIRESTORE RULES NOTICE:')
      console.log('Cloud Firestore returned PERMISSION_DENIED. In Firebase Console (reshmam-oil):')
      console.log('1. Go to Firestore Database -> Rules')
      console.log('2. Paste the rules from firestore.rules (or set allow read, write: if true; for initial setup)')
      console.log('3. Click "Publish"')
      console.log('4. Re-run: node scripts/sync-firestore.mjs\n')
    }
    process.exit(1)
  })
}

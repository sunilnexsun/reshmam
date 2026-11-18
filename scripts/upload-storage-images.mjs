import fs from 'node:fs'
import path from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, doc, updateDoc, getDocs, collection } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDWfC3Z-5nYzmDKIoLRwRCAkCQhIKQH8LI",
  authDomain: "reshmam-oil.firebaseapp.com",
  projectId: "reshmam-oil",
  storageBucket: "reshmam-oil.firebasestorage.app",
  messagingSenderId: "245127746311",
  appId: "1:245127746311:web:fb9041eea8686cb0e06ba2"
}

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)
const db = getFirestore(app)

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

async function uploadFileToStorage(localFilePath, storagePath) {
  if (!fs.existsSync(localFilePath)) {
    console.warn(`Local file not found: ${localFilePath}`)
    return null
  }
  const ext = localFilePath.slice(localFilePath.lastIndexOf('.')).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'image/webp'
  const fileBuffer = fs.readFileSync(localFilePath)
  const storageRef = ref(storage, storagePath)

  console.log(`Uploading ${localFilePath} -> gs://reshmam-oil.firebasestorage.app/${storagePath}...`)
  await uploadBytes(storageRef, fileBuffer, {
    contentType,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      source: 'catalog_sync',
    },
  })
  const downloadUrl = await getDownloadURL(storageRef)
  console.log(`  Uploaded! URL: ${downloadUrl}`)
  return downloadUrl
}

async function main() {
  console.log('=== Starting Upload of Catalog Images to Firebase Cloud Storage ===\n')

  // 1. Upload Brand Logos
  const brandLogos = {}
  if (fs.existsSync('public/images/logo-mark.png')) {
    brandLogos.mark = await uploadFileToStorage('public/images/logo-mark.png', 'brands/logo-mark.png')
  }
  if (fs.existsSync('public/images/logo.png')) {
    brandLogos.full = await uploadFileToStorage('public/images/logo.png', 'brands/logo.png')
  }

  // 2. Upload Category Images
  const categoryImageMap = {
    cat_gin: 'public/images/product-gingelly.webp',
    cat_coc: 'public/images/product-coconut.webp',
    cat_grn: 'public/images/product-groundnut.webp',
    cat_cas: 'public/images/reshmam-sesame-oil.webp',
    cat_cmb: 'public/images/pack-combo.webp',
    cat_cf: 'public/images/pack-gingelly.webp',
  }

  const categoryUrls = {}
  for (const [catId, localPath] of Object.entries(categoryImageMap)) {
    const filename = localPath.split('/').pop()
    const url = await uploadFileToStorage(localPath, `categories/${filename}`)
    if (url) categoryUrls[catId] = url
  }

  // 3. Upload Product Images
  const productFiles = [
    'public/images/products/gingelly-1l.webp',
    'public/images/products/gingelly-500ml.webp',
    'public/images/products/coconut-1l.webp',
    'public/images/products/coconut-500ml.webp',
    'public/images/products/groundnut-1l.webp',
    'public/images/products/groundnut-500ml.webp',
    'public/images/product-gingelly.webp',
    'public/images/product-coconut.webp',
    'public/images/product-groundnut.webp',
    'public/images/reshmam-sesame-oil.webp',
    'public/images/pack-combo.webp',
    'public/images/pack-gingelly.webp',
  ]

  const uploadedProductUrls = {}
  for (const pFile of productFiles) {
    const name = pFile.split('/').pop()
    const url = await uploadFileToStorage(pFile, `products/${name}`)
    if (url) uploadedProductUrls[name] = url
  }

  console.log('\n=== Updating Firestore Documents with Storage URLs ===\n')

  // Update Categories in Firestore
  for (const [catId, storageUrl] of Object.entries(categoryUrls)) {
    try {
      await updateDoc(doc(db, 'categories', catId), { image: storageUrl, updatedAt: new Date().toISOString() })
      console.log(`Updated Firestore category "${catId}" with Storage URL`)
    } catch (e) {
      console.warn(`Could not update category ${catId}:`, e.message)
    }
  }

  // Update Brands in Firestore
  const brandSnap = await getDocs(collection(db, 'brands'))
  for (const bDoc of brandSnap.docs) {
    try {
      const logoUrl = brandLogos.mark || brandLogos.full
      if (logoUrl) {
        await updateDoc(doc(db, 'brands', bDoc.id), { logo: logoUrl, image: logoUrl, updatedAt: new Date().toISOString() })
        console.log(`Updated Firestore brand "${bDoc.id}" with Storage URL`)
      }
    } catch (e) {
      console.warn(`Could not update brand ${bDoc.id}:`, e.message)
    }
  }

  // Update Products in Firestore
  const productSnap = await getDocs(collection(db, 'products'))
  for (const pDoc of productSnap.docs) {
    const p = pDoc.data()
    const id = pDoc.id
    let newImages = []

    if (id.includes('coc') || p.name?.toLowerCase().includes('coconut')) {
      newImages = [
        uploadedProductUrls['coconut-1l.webp'] || uploadedProductUrls['product-coconut.webp'],
        uploadedProductUrls['coconut-500ml.webp'],
      ].filter(Boolean)
    } else if (id.includes('grn') || p.name?.toLowerCase().includes('groundnut')) {
      newImages = [
        uploadedProductUrls['groundnut-1l.webp'] || uploadedProductUrls['product-groundnut.webp'],
        uploadedProductUrls['groundnut-500ml.webp'],
      ].filter(Boolean)
    } else if (id.includes('cmb') || p.name?.toLowerCase().includes('combo')) {
      newImages = [uploadedProductUrls['pack-combo.webp']].filter(Boolean)
    } else if (id.includes('cf') || p.name?.toLowerCase().includes('feed') || p.name?.toLowerCase().includes('cake')) {
      newImages = [uploadedProductUrls['pack-gingelly.webp']].filter(Boolean)
    } else {
      newImages = [
        uploadedProductUrls['gingelly-1l.webp'] || uploadedProductUrls['product-gingelly.webp'],
        uploadedProductUrls['gingelly-500ml.webp'],
      ].filter(Boolean)
    }

    if (newImages.length > 0) {
      try {
        await updateDoc(doc(db, 'products', id), {
          images: newImages,
          image: newImages[0],
          updatedAt: new Date().toISOString(),
        })
        console.log(`Updated Firestore product "${p.name || id}" with ${newImages.length} Storage image(s)`)
      } catch (e) {
        console.warn(`Could not update product ${id}:`, e.message)
      }
    }
  }

  console.log('\nAll images uploaded to Firebase Storage and linked in Firestore!')
}

main().catch((err) => {
  console.error('Fatal upload error:', err)
  process.exit(1)
})

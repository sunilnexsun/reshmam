import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export const firebaseConfig = {
  apiKey: "AIzaSyDWfC3Z-5nYzmDKIoLRwRCAkCQhIKQH8LI",
  authDomain: "reshmam-oil.firebaseapp.com",
  projectId: "reshmam-oil",
  storageBucket: "reshmam-oil.firebasestorage.app",
  messagingSenderId: "245127746311",
  appId: "1:245127746311:web:fb9041eea8686cb0e06ba2"
}

// Initialize Firebase singleton
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)

let firestoreInstance
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  })
} catch {
  firestoreInstance = getFirestore(app)
}
export const db = firestoreInstance
export const storage = getStorage(app)

/** Authorization header carrying the signed-in staff member's Firebase ID token ({} when signed out). */
export async function authHeader() {
  const user = auth.currentUser
  if (!user) return {}
  return { Authorization: `Bearer ${await user.getIdToken()}` }
}

/**
 * Validates and uploads an image file directly to Firebase Storage.
 * @param {File} file
 * @param {Object} options
 * @param {string} [options.pathPrefix='products'] - Storage path prefix
 * @param {number} [options.maxSizeMB=2] - Maximum allowed file size in MB
 * @returns {Promise<string>} Download URL of the uploaded image
 */
export async function uploadProductImage(file, { pathPrefix = 'products', maxSizeMB = 2 } = {}) {
  if (!file) throw new Error('No file provided.')
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPG, PNG, WebP).')
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error(`File "${file.name}" exceeds the ${maxSizeMB} MB size limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`)
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const fullPath = `${pathPrefix}/${timestamp}_${randomStr}_${cleanName}`

  const storageRef = ref(storage, fullPath)
  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
    },
  }

  const snapshot = await uploadBytes(storageRef, file, metadata)
  const downloadUrl = await getDownloadURL(snapshot.ref)
  return downloadUrl
}

/**
 * Deletes an image from Firebase Storage by URL if it belongs to this storage bucket.
 * @param {string} url
 */
export async function deleteStorageImage(url) {
  if (!url || typeof url !== 'string') return
  try {
    if (url.includes('firebasestorage.googleapis.com') || url.includes('reshmam-oil')) {
      const storageRef = ref(storage, url)
      await deleteObject(storageRef)
    }
  } catch (err) {
    console.warn('Could not delete storage image:', err.message)
  }
}

/**
 * Subscribes to a Firestore collection and provides real-time updates.
 */
export function subscribeCollection(colName, onData, onError) {
  const colRef = collection(db, colName)
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = []
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() })
      })
      onData(items, snapshot.metadata)
    },
    (err) => {
      console.warn(`Firestore subscription error on ${colName}:`, err)
      if (onError) onError(err)
    }
  )
}

/**
 * Strips undefined properties recursively so Firestore setDoc does not throw invalid-argument errors.
 */
function sanitizeForFirestore(val) {
  if (val === undefined) return null
  if (val === null || typeof val !== 'object') return val
  if (val instanceof Date) return val.toISOString()
  if (Array.isArray(val)) return val.map(sanitizeForFirestore)
  const clean = {}
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = sanitizeForFirestore(v)
    }
  }
  return clean
}

// Track active writes & monotonic write generation so stale polls/snapshots never overwrite user edits/deletes.
let pendingWrites = 0
let writeVersion = 0
const docQueues = new Map()

export const getPendingWrites = () => pendingWrites
export const getWriteVersion = () => writeVersion

function isBrowserRuntime() {
  return (
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string' &&
    window.location.origin.startsWith('http') &&
    !globalThis?.process?.env?.VITEST
  )
}

function enqueueDocWrite(key, task) {
  pendingWrites += 1
  writeVersion += 1
  const prev = docQueues.get(key) || Promise.resolve()
  const run = prev
    .catch(() => {})
    .then(task)
    .finally(() => {
      pendingWrites = Math.max(0, pendingWrites - 1)
      if (docQueues.get(key) === run) docQueues.delete(key)
    })
  docQueues.set(key, run)
  return run
}

async function postToProxy(payload) {
  const res = await fetch('/api/admin/firestore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Server API returned HTTP ${res.status}`)
  }
  return json
}

/**
 * Saves or updates a document in Firestore.
 * Uses the server API proxy in the browser (ad-blocker proof, verified HTTP 200),
 * falling back to direct client Firestore SDK if needed.
 */
export function saveDocument(colName, id, data, { merge = true } = {}) {
  if (!id) return Promise.reject(new Error('Document ID is required'))
  const docId = String(id)
  const cleanData = sanitizeForFirestore({ ...data, id: docId, updatedAt: new Date().toISOString() })

  return enqueueDocWrite(`${colName}/${docId}`, async () => {
    if (isBrowserRuntime()) {
      try {
        await postToProxy({ action: 'save', col: colName, id: docId, data: cleanData, merge })
        console.log(`[Firestore] Saved ${colName}/${docId}`)
        return
      } catch (proxyErr) {
        console.warn(`[Firestore] Server proxy save failed for ${colName}/${docId}, trying direct SDK:`, proxyErr.message)
      }
    }

    const docRef = doc(db, colName, docId)
    await setDoc(docRef, cleanData, { merge })
    console.log(`[Firestore] Saved (direct SDK) ${colName}/${docId}`)
  })
}

/**
 * Deletes a document from Firestore.
 */
export function deleteDocument(colName, id) {
  if (!id) return Promise.resolve()
  const docId = String(id)

  return enqueueDocWrite(`${colName}/${docId}`, async () => {
    if (isBrowserRuntime()) {
      try {
        await postToProxy({ action: 'delete', col: colName, id: docId })
        console.log(`[Firestore] Deleted ${colName}/${docId}`)
        return
      } catch (proxyErr) {
        console.warn(`[Firestore] Server proxy delete failed for ${colName}/${docId}, trying direct SDK:`, proxyErr.message)
      }
    }

    const docRef = doc(db, colName, docId)
    await deleteDoc(docRef)
    console.log(`[Firestore] Deleted (direct SDK) ${colName}/${docId}`)
  })
}

/**
 * Runs an ordered batch of save/delete operations in Firestore.
 * operations: [{ type: 'save' | 'delete', col, id, data?, merge? }]
 */
export function batchFirestore(operations) {
  if (!Array.isArray(operations) || operations.length === 0) return Promise.resolve()
  const cleanOps = operations
    .filter((op) => op?.col && op?.id)
    .map((op) => ({
      type: op.type === 'delete' ? 'delete' : 'save',
      col: String(op.col),
      id: String(op.id),
      merge: op.merge !== false,
      ...(op.type !== 'delete'
        ? { data: sanitizeForFirestore({ ...(op.data || {}), id: String(op.id), updatedAt: new Date().toISOString() }) }
        : {}),
    }))

  if (!cleanOps.length) return Promise.resolve()

  return enqueueDocWrite('__batch__', async () => {
    if (isBrowserRuntime()) {
      try {
        await postToProxy({ action: 'batch', operations: cleanOps })
        console.log(`[Firestore] Batch synced ${cleanOps.length} operations`)
        return
      } catch (proxyErr) {
        console.warn('[Firestore] Server proxy batch failed, trying direct SDK:', proxyErr.message)
      }
    }

    for (const op of cleanOps) {
      const docRef = doc(db, op.col, op.id)
      if (op.type === 'delete') {
        await deleteDoc(docRef)
      } else {
        await setDoc(docRef, op.data, { merge: op.merge })
      }
    }
  })
}

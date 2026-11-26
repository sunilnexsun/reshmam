export const DEFAULT_INVOICE_LOGO = '/images/logo.png'

/** Loads an image source into a decoded PNG data URL + natural dimensions. */
export function loadImageAsPngDataUrl(src) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !src) return resolve(null)
    if (String(src).startsWith('data:image/png')) {
      const probe = new window.Image()
      probe.onload = () => resolve({ dataUrl: src, width: probe.naturalWidth || 640, height: probe.naturalHeight || 341 })
      probe.onerror = () => resolve(null)
      probe.src = src
      return
    }
    const img = new window.Image()
    if (!String(src).startsWith('/') && !String(src).startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    const timer = setTimeout(() => resolve(null), 4000)
    img.onload = () => {
      clearTimeout(timer)
      try {
        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        if (!w || !h) return resolve(null)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = src
  })
}

/** Resolves company logo (or default RESHMAM logo) as an in-memory PNG data URL. */
export async function resolveInvoiceLogo(customLogo) {
  if (customLogo) {
    const loaded = await loadImageAsPngDataUrl(customLogo)
    if (loaded) return loaded
  }
  return loadImageAsPngDataUrl(DEFAULT_INVOICE_LOGO)
}

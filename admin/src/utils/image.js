// Reads an uploaded image file, downsizes it on a canvas and returns a compact data URL
// (keeps localStorage small). Backend phase: replace with an upload to storage that returns a URL.
export function fileToDataUrl(file, maxSize = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'))
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Image must be under 8 MB.'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image.'))
      img.onload = () => {
        const s = Math.min(1, maxSize / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/webp', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

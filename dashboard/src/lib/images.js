// Pienentää kuvan (max 1600 px pidempi sivu) ja muuntaa JPEG:ksi ennen latausta.
export async function prepareImage(file, maxSide = 1600, quality = 0.86) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    bitmap = await loadViaImg(file)
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Kuvan muunnos epäonnistui'))), 'image/jpeg', quality),
  )
}

function loadViaImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Kuvaa ${file.name} ei voitu lukea (HEIC? Vaihda kameran asetuksista "Yhteensopivin" tai lataa puhelimen selaimella).`))
    }
    img.src = url
  })
}

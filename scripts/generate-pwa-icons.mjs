import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const regularSource = fileURLToPath(new URL('../assets/brand/brabita-logo.png', import.meta.url))
const maskableSource = fileURLToPath(new URL('../assets/brand/brabita-logo-maskable.png', import.meta.url))

const outputPath = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))
const pngOptions = { compressionLevel: 9, palette: true, quality: 100 }

// Optional source import strips metadata without changing the artwork.
if (process.argv[2]) {
  await sharp(process.argv[2]).rotate().png({ compressionLevel: 9 }).toFile(regularSource)
}

const background = '#ea6b7e'
const { data, info } = await sharp(regularSource).removeAlpha().raw().toBuffer({ resolveWithObject: true })
if (info.width !== info.height) throw new Error('A fonte do ícone deve ser quadrada.')
const center = (info.width - 1) / 2
const boundary = []
for (let y = 0; y < info.height; y++) {
  let first = -1
  let last = -1
  for (let x = 0; x < info.width; x++) {
    const offset = (y * info.width + x) * info.channels
    const distanceFromBackground = Math.max(
      Math.abs(data[offset] - 234), Math.abs(data[offset + 1] - 107), Math.abs(data[offset + 2] - 126),
    )
    if (distanceFromBackground > 8) {
      if (first === -1) first = x
      last = x
    }
  }
  if (first !== -1) boundary.push([first, y], [last, y])
}
if (!boundary.length) throw new Error('A fonte do ícone não contém uma personagem visível.')
const radiusAt = (cx, cy) => Math.sqrt(boundary.reduce((maximum, [x, y]) =>
  Math.max(maximum, (x - cx) ** 2 + (y - cy) ** 2), 0))
let cx = center
let cy = center
let foregroundRadius = radiusAt(cx, cy)
// Fit the actual silhouette, not its rectangular canvas: this avoids
// unnecessary padding while preserving whiskers, ears, hair and arm.
for (let step = info.width / 4; step > 0.1; step /= 2) {
  let improved = true
  while (improved) {
    improved = false
    let nextX = cx
    let nextY = cy
    for (const dx of [-step, 0, step]) for (const dy of [-step, 0, step]) {
      const radius = radiusAt(cx + dx, cy + dy)
      if (radius < foregroundRadius) {
        foregroundRadius = radius
        nextX = cx + dx
        nextY = cy + dy
        improved = true
      }
    }
    cx = nextX
    cy = nextY
  }
}
// Maskable guarantees a circle with radius 40% of the image width.
// Use 39.2%: almost the full safe circle, with ~4 px spare at 512 px.
const scale = Math.min(1, info.width * 0.392 / foregroundRadius)
const artworkSize = Math.floor(info.width * scale)
const actualScale = artworkSize / info.width
const left = Math.round(center - ((cx + 0.5) * actualScale - 0.5))
const top = Math.round(center - ((cy + 0.5) * actualScale - 0.5))
const artwork = await sharp(regularSource).resize(artworkSize, artworkSize).toBuffer()
await sharp({ create: { width: info.width, height: info.height, channels: 3, background } })
  .composite([{ input: artwork, left, top }])
  .png({ compressionLevel: 9 })
  .toFile(maskableSource)

const regularIcons = [
  { size: 32, name: 'brabita-favicon-32.png' },
  { size: 180, name: 'brabita-apple-touch-icon.png' },
  { size: 192, name: 'brabita-icon-192.png' },
  { size: 512, name: 'brabita-icon-512.png' },
]

await Promise.all(regularIcons.map(({ size, name }) => sharp(regularSource)
  .resize(size, size, { fit: 'contain', background })
  .png(pngOptions)
  .toFile(outputPath(name))))

const maskableSize = 512
await sharp(maskableSource)
  .resize(maskableSize, maskableSize, { fit: 'contain', background })
  .png(pngOptions)
  .toFile(outputPath('brabita-icon-512-maskable.png'))

console.log('Ícones PWA gerados a partir das fontes regular e maskable da Brabita')

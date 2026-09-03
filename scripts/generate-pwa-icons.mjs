import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../assets/brand/brabita-logo.png', import.meta.url))

const outputPath = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))
const pngOptions = { compressionLevel: 9, palette: true, quality: 100 }

const regularIcons = [
  { size: 32, name: 'brabita-favicon-32.png' },
  { size: 180, name: 'brabita-apple-touch-icon.png' },
  { size: 192, name: 'brabita-icon-192.png' },
  { size: 512, name: 'brabita-icon-512.png' },
]

await Promise.all(regularIcons.map(({ size, name }) => sharp(source)
  .resize(size, size, { fit: 'cover' })
  .png(pngOptions)
  .toFile(outputPath(name))))

const maskableSize = 512
const safeArtworkSize = Math.round(maskableSize * 0.82)
const cornerPixel = await sharp(source)
  .ensureAlpha()
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .raw()
  .toBuffer()
const sourceCorner = {
  r: cornerPixel[0],
  g: cornerPixel[1],
  b: cornerPixel[2],
  alpha: cornerPixel[3] / 255,
}

const safeArtwork = await sharp(source)
  .resize(safeArtworkSize, safeArtworkSize, { fit: 'contain' })
  .png()
  .toBuffer()

await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: sourceCorner,
  },
})
  .composite([{ input: safeArtwork, gravity: 'centre' }])
  .png(pngOptions)
  .toFile(outputPath('brabita-icon-512-maskable.png'))

console.log('Ícones PWA gerados a partir de assets/brand/brabita-logo.png')

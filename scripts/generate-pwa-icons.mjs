import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../assets/brand/tg-logo.png', import.meta.url))

const outputPath = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))
const pngOptions = { compressionLevel: 9, palette: true, quality: 100 }

const regularIcons = [
  { size: 32, name: 'favicon-32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
]

const cornerPixel = await sharp(source)
  .ensureAlpha()
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .raw()
  .toBuffer()

const background = {
  r: cornerPixel[0],
  g: cornerPixel[1],
  b: cornerPixel[2],
  alpha: cornerPixel[3] / 255,
}

await Promise.all(regularIcons.map(({ size, name }) => sharp(source)
  .resize(size, size, { fit: 'cover' })
  .png(pngOptions)
  .toFile(outputPath(name))))

const maskableSize = 512
const safeArtworkSize = Math.round(maskableSize * 0.72)
const safeArtwork = await sharp(source)
  .resize(safeArtworkSize, safeArtworkSize, { fit: 'contain' })
  .png()
  .toBuffer()

await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background,
  },
})
  .composite([{ input: safeArtwork, gravity: 'centre' }])
  .png(pngOptions)
  .toFile(outputPath('icon-512-maskable.png'))

console.log('Ícones PWA gerados a partir de assets/brand/tg-logo.png')

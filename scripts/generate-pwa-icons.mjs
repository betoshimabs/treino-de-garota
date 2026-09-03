import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const regularSource = fileURLToPath(new URL('../assets/brand/brabita-logo.png', import.meta.url))
const maskableSource = fileURLToPath(new URL('../assets/brand/brabita-logo-maskable.png', import.meta.url))

const outputPath = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))
const pngOptions = { compressionLevel: 9, palette: true, quality: 100 }

const regularIcons = [
  { size: 32, name: 'brabita-favicon-32.png' },
  { size: 180, name: 'brabita-apple-touch-icon.png' },
  { size: 192, name: 'brabita-icon-192.png' },
  { size: 512, name: 'brabita-icon-512.png' },
]

await Promise.all(regularIcons.map(({ size, name }) => sharp(regularSource)
  .resize(size, size, { fit: 'cover' })
  .png(pngOptions)
  .toFile(outputPath(name))))

const maskableSize = 512
await sharp(maskableSource)
  .resize(maskableSize, maskableSize, { fit: 'cover' })
  .png(pngOptions)
  .toFile(outputPath('brabita-icon-512-maskable.png'))

console.log('Ícones PWA gerados a partir das fontes regular e maskable da Brabita')

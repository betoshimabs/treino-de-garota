import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../public/brand-mark.svg', import.meta.url))
const outputs = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
]

await Promise.all(outputs.map(({ size, name }) => sharp(source)
  .resize(size, size)
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)))))

console.log('Ícones PWA gerados a partir de public/brand-mark.svg')

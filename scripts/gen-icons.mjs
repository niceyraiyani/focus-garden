// Generates PWA raster icons from public/icon.svg using sharp.
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const pub = join(dir, '..', 'public')
const svg = readFileSync(join(pub, 'icon.svg'))

async function gen(size, name) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(pub, name))
  console.log('  ✓', name)
}

async function maskable(size, name, pad) {
  const inner = Math.round(size * (1 - pad * 2))
  const icon = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#0d1117' },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(join(pub, name))
  console.log('  ✓', name)
}

console.log('Generating icons…')
await gen(192, 'icon-192.png')
await gen(512, 'icon-512.png')
await gen(180, 'apple-touch-icon.png')
await maskable(512, 'icon-maskable-512.png', 0.14)
console.log('Done.')

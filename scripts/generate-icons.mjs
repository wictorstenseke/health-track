// Draws the app icons and favicon into public/: the logo art (icon-logo.png) on the warm sheen background
// below. Run `npm run icons` after changing either; the file names match vite.config.ts and index.html.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const LOGO = fileURLToPath(new URL('./icon-logo.png', import.meta.url))
const OUT = fileURLToPath(new URL('../public/', import.meta.url))

// The background as CSS writes it, layers top first:
//   radial-gradient(80% 55% at 0% 0%, rgba(255, 180, 110, 0.10) 0%, rgba(255, 180, 110, 0) 100%),
//   radial-gradient(55% 40% at 100% 100%, rgba(255, 140, 40, 0.14) 0%, rgba(255, 140, 40, 0) 100%),
//   radial-gradient(130% 80% at 100% 110%, rgba(255, 70, 10, 0.28) 0%, rgba(255, 70, 10, 0) 60%),
//   linear-gradient(165deg, #1d1b1a 0%, #141312 45%, #0d0c0b 100%)
const GLOWS = [
  { rx: 0.8, ry: 0.55, cx: 0, cy: 0, rgb: '255,180,110', opacity: 0.1, end: 1 },
  { rx: 0.55, ry: 0.4, cx: 1, cy: 1, rgb: '255,140,40', opacity: 0.14, end: 1 },
  { rx: 1.3, ry: 0.8, cx: 1, cy: 1.1, rgb: '255,70,10', opacity: 0.28, end: 0.6 },
]
const BASE = { angle: 165, stops: [['#1d1b1a', 0], ['#141312', 0.45], ['#0d0c0b', 1]] }

// `logo` is the share of the icon's width the logo spans.
const ICONS = [
  { file: 'pwa-64x64.png', size: 64, logo: 0.68 },
  { file: 'pwa-192x192.png', size: 192, logo: 0.68 },
  { file: 'pwa-512x512.png', size: 512, logo: 0.68 },
  { file: 'apple-touch-icon-180x180.png', size: 180, logo: 0.68 },
  // Android may crop a maskable icon to a centred circle 80% wide, so the logo keeps inside it.
  { file: 'maskable-icon-512x512.png', size: 512, logo: 0.56 },
]
// Browser tabs show the icon tiny and unmasked: a bigger logo on a rounded square.
const FAVICON = { file: 'favicon.ico', sizes: [16, 32, 48], logo: 0.8, radius: 0.225 }

function backgroundSvg(size) {
  // CSS angles run clockwise from 'to top'; the gradient line spans the box's corners along that direction.
  const rad = (BASE.angle * Math.PI) / 180
  const [dx, dy] = [Math.sin(rad), -Math.cos(rad)]
  const half = (size * (Math.abs(dx) + Math.abs(dy))) / 2
  const linear = `<linearGradient id="base" gradientUnits="userSpaceOnUse" x1="${size / 2 - dx * half}" y1="${size / 2 - dy * half}" x2="${size / 2 + dx * half}" y2="${size / 2 + dy * half}">${BASE.stops.map(([color, at]) => `<stop offset="${at}" stop-color="${color}"/>`).join('')}</linearGradient>`
  const radials = GLOWS.map(
    (g, i) =>
      `<radialGradient id="glow${i}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${g.cx * size} ${g.cy * size}) scale(${g.rx * size} ${g.ry * size})"><stop offset="0" stop-color="rgb(${g.rgb})" stop-opacity="${g.opacity}"/><stop offset="${g.end}" stop-color="rgb(${g.rgb})" stop-opacity="0"/></radialGradient>`,
  )
  // SVG paints in order, so the bottom CSS layer goes first.
  const layers = ['base', ...GLOWS.map((_, i) => `glow${i}`).reverse()]
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs>${linear}${radials.join('')}</defs>${layers.map((id) => `<rect width="${size}" height="${size}" fill="url(#${id})"/>`).join('')}</svg>`,
  )
}

/** The logo cropped to its shape, without the specks a background remover leaves around it. */
async function loadLogo() {
  const { data, info } = await sharp(LOGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const parts = connectedParts(data, width, height)
  const largest = Math.max(...parts.map((p) => p.pixels.length))
  let [left, top, right, bottom] = [width, height, 0, 0]
  for (const { pixels } of parts) {
    // Anything under half a percent of the main shape is a speck, not part of the logo.
    if (pixels.length < largest * 0.005) {
      for (const p of pixels) data[p * 4 + 3] = 0
      continue
    }
    for (const p of pixels) {
      const [x, y] = [p % width, Math.floor(p / width)]
      ;[left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)]
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer()
}

/** Groups the pixels that aren't fully transparent into 4-connected parts. */
function connectedParts(rgba, width, height) {
  const seen = new Uint8Array(width * height)
  const parts = []
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || rgba[start * 4 + 3] === 0) continue
    const pixels = []
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const p = stack.pop()
      pixels.push(p)
      const [x, y] = [p % width, Math.floor(p / width)]
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const n = ny * width + nx
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[n] || rgba[n * 4 + 3] === 0) continue
        seen[n] = 1
        stack.push(n)
      }
    }
    parts.push({ pixels })
  }
  return parts
}

async function drawIcon(logo, size, logoShare) {
  const mark = await sharp(logo).resize({ width: Math.round(size * logoShare) }).toBuffer()
  const { width, height } = await sharp(mark).metadata()
  return sharp(backgroundSvg(size))
    .composite([{ input: mark, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) }])
    .png()
    .toBuffer()
}

async function roundCorners(png, size, radius) {
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * radius}" fill="#fff"/></svg>`
  return sharp(png).composite([{ input: Buffer.from(mask), blend: 'dest-in' }]).png().toBuffer()
}

/** An .ico holding PNGs, which every current browser reads. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size % 256, entry) // 0 means 256
    header.writeUInt8(size % 256, entry + 1)
    header.writeUInt16LE(1, entry + 4) // colour planes
    header.writeUInt16LE(32, entry + 6) // bits per pixel
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((image) => image.png)])
}

const logo = await loadLogo()
for (const { file, size, logo: share } of ICONS) {
  await writeFile(OUT + file, await drawIcon(logo, size, share))
  console.log(`public/${file}`)
}
const favicons = await Promise.all(
  FAVICON.sizes.map(async (size) => ({
    size,
    png: await roundCorners(await drawIcon(logo, size, FAVICON.logo), size, FAVICON.radius),
  })),
)
await writeFile(OUT + FAVICON.file, ico(favicons))
console.log(`public/${FAVICON.file}`)

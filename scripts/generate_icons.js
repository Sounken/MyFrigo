/**
 * Generates the PWA icons.
 *
 * Written by hand rather than pulled from an image library: the icon is three
 * rectangles, and a build dependency for that would cost more than it saves.
 * Run it once — the PNGs are committed.
 */
import { crc32 } from 'node:zlib'
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'public', 'icons')

const BACKGROUND = [10, 10, 10]
const BODY = [52, 211, 153]
const SEAM = [10, 10, 10]

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(typeAndData) >>> 0)
  return Buffer.concat([length, typeAndData, checksum])
}

function encodePng(size, pixelAt) {
  /** Each row is prefixed with a filter byte; 0 means "store as-is". */
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let offset = 0

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y, size)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
      raw[offset++] = 255
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  header[10] = 0 // deflate
  header[11] = 0 // adaptive filtering
  header[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** A fridge: rounded body, a seam near the top, two handles beside it. */
function fridge(x, y, size) {
  const unit = size / 100
  const left = 30 * unit
  const right = 70 * unit
  const top = 16 * unit
  const bottom = 84 * unit
  const radius = 6 * unit

  const insideBox = x >= left && x <= right && y >= top && y <= bottom
  if (!insideBox) return BACKGROUND

  /** Knock the corners off so it does not read as a plain rectangle. */
  const cornerX = Math.min(x - left, right - x)
  const cornerY = Math.min(y - top, bottom - y)
  if (cornerX < radius && cornerY < radius) {
    const dx = radius - cornerX
    const dy = radius - cornerY
    if (dx * dx + dy * dy > radius * radius) return BACKGROUND
  }

  const seamY = 40 * unit
  if (y >= seamY && y <= seamY + 2.5 * unit) return SEAM

  const handleX = 62 * unit
  const handleWidth = 3 * unit
  const inHandleColumn = x >= handleX && x <= handleX + handleWidth
  if (inHandleColumn && y >= 28 * unit && y <= 37 * unit) return SEAM
  if (inHandleColumn && y >= 46 * unit && y <= 58 * unit) return SEAM

  return BODY
}

mkdirSync(outputDir, { recursive: true })

for (const size of [180, 192, 512]) {
  const file = join(outputDir, `icon-${size}.png`)
  writeFileSync(file, encodePng(size, fridge))
  console.log(`Wrote ${file}`)
}

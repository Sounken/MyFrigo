/**
 * Copies the ZXing WebAssembly binary into `public/`.
 *
 * zxing-wasm defaults to fetching it from a CDN. Serving it ourselves keeps
 * the scanner working with no third-party request, and means an installed PWA
 * can cache it like any other asset.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const source = require.resolve('zxing-wasm/reader/zxing_reader.wasm')
const destination = join(root, 'public', 'zxing_reader.wasm')

mkdirSync(join(root, 'public'), { recursive: true })
copyFileSync(source, destination)

console.log(`Copied ${source} -> ${destination}`)

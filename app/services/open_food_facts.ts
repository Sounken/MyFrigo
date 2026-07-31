import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Product from '#models/product'

/**
 * Open Food Facts asks for one API call per real user scan. Every lookup is
 * therefore cached in the `products` table and served from there forever
 * after — product metadata effectively never changes, and a re-scan of
 * something already in the fridge must not hit the network at all.
 *
 * Data licensed under the ODbL. Attribution is shown in the app footer.
 */

const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org'
const DEFAULT_USER_AGENT = 'MyFrigo/1.0 (deuleydamien@gmail.com)'

/** Trimming the payload keeps mobile lookups fast on a weak signal. */
const FIELDS = [
  'product_name',
  'product_name_fr',
  'brands',
  'quantity',
  'image_small_url',
  'categories_tags',
  'nutriscore_grade',
].join(',')

const TIMEOUT_MS = 6000

type OffResponse = {
  status: 0 | 1
  product?: {
    product_name?: string
    product_name_fr?: string
    brands?: string
    quantity?: string
    image_small_url?: string
    categories_tags?: string[]
    nutriscore_grade?: string
  }
}

export type LookupResult =
  | { outcome: 'found'; product: Product; fromCache: boolean }
  | { outcome: 'not_found' }
  | { outcome: 'skipped' }
  | { outcome: 'error'; message: string }

/**
 * Returns the cached product, or asks Open Food Facts and caches the answer.
 * Never throws: a network failure downgrades to manual entry rather than
 * interrupting a burst of scans at the kitchen counter.
 */
export async function lookup(barcode: string): Promise<LookupResult> {
  const cached = await Product.find(barcode)
  if (cached) {
    return { outcome: 'found', product: cached, fromCache: true }
  }

  const baseUrl = env.get('OFF_BASE_URL') ?? DEFAULT_BASE_URL
  const url = `${baseUrl}/api/v2/product/${barcode}.json?fields=${FIELDS}`

  let payload: OffResponse
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': env.get('OFF_USER_AGENT') ?? DEFAULT_USER_AGENT,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    /** OFF answers 404 with a valid body for unknown products. */
    if (!response.ok && response.status !== 404) {
      return { outcome: 'error', message: `Open Food Facts a répondu ${response.status}` }
    }

    payload = (await response.json()) as OffResponse
  } catch (error) {
    logger.warn({ barcode, err: error }, 'Open Food Facts lookup failed')
    return {
      outcome: 'error',
      message:
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Open Food Facts ne répond pas'
          : 'Réseau indisponible',
    }
  }

  if (payload.status !== 1 || !payload.product) {
    return { outcome: 'not_found' }
  }

  const off = payload.product
  const name = off.product_name_fr?.trim() || off.product_name?.trim()

  /** A product with no usable name is no better than an unknown one. */
  if (!name) {
    return { outcome: 'not_found' }
  }

  const product = await Product.create({
    barcode,
    name,
    brands: off.brands?.trim() || null,
    quantityLabel: off.quantity?.trim() || null,
    imageUrl: off.image_small_url || null,
    nutriscore: off.nutriscore_grade?.trim().toLowerCase().slice(0, 1) || null,
    categoriesTags: off.categories_tags ?? [],
    source: 'off',
    fetchedAt: DateTime.now(),
  })

  return { outcome: 'found', product, fromCache: false }
}

import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Product, {
  type ProductNutrientLevels,
  type ProductNutriments,
  type ProductQualityAttribute,
  type ProductQualityAttributes,
} from '#models/product'

/**
 * Open Food Facts is queried once per product and cached locally. Product
 * composition is community data: the UI always reminds users to check the pack.
 */

const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org'
const DEFAULT_USER_AGENT = 'MyFrigo/1.1 (deuleydamien@gmail.com)'

const FIELDS = [
  'product_name',
  'product_name_fr',
  'brands',
  'quantity',
  'image_small_url',
  'categories_tags',
  'nutriscore_grade',
  'nutrition_grades',
  'ingredients_text_fr',
  'ingredients_text',
  'allergens_tags',
  'additives_tags',
  'labels_tags',
  'nova_group',
  'nutrient_levels',
  'nutriments',
  'attribute_groups_fr',
].join(',')

const TIMEOUT_MS = 6000
const COMPOSITION_VERSION = 3

type OffAttribute = {
  id?: string
  status?: 'known' | 'unknown' | 'not-applicable'
  match?: number
  title?: string
  description_short?: string
}

type OffProduct = {
  product_name?: string
  product_name_fr?: string
  brands?: string
  quantity?: string
  image_small_url?: string
  categories_tags?: string[]
  nutriscore_grade?: string
  nutrition_grades?: string
  ingredients_text_fr?: string
  ingredients_text?: string
  allergens_tags?: string[]
  additives_tags?: string[]
  labels_tags?: string[]
  nova_group?: number
  nutrient_levels?: Record<string, unknown>
  nutriments?: Record<string, unknown>
  attribute_groups_fr?: { attributes?: OffAttribute[] }[]
}

type OffResponse = { status: 0 | 1; product?: OffProduct }

export type LookupResult =
  | { outcome: 'found'; product: Product; fromCache: boolean }
  | { outcome: 'not_found' }
  | { outcome: 'skipped' }
  | { outcome: 'error'; message: string }

export async function lookup(barcode: string): Promise<LookupResult> {
  const cached = await Product.find(barcode)
  if (cached) return { outcome: 'found', product: cached, fromCache: true }

  const result = await requestProduct(barcode)
  if (result.outcome !== 'found') return result

  const name = productName(result.product)
  if (!name) return { outcome: 'not_found' }

  const now = DateTime.now()
  const product = await Product.create({
    barcode,
    name,
    brands: result.product.brands?.trim() || null,
    quantityLabel: result.product.quantity?.trim() || null,
    imageUrl: result.product.image_small_url || null,
    nutriscore: nutriscore(result.product),
    categoriesTags: result.product.categories_tags ?? [],
    source: 'off',
    fetchedAt: now,
    compositionFetchedAt: now,
    compositionVersion: COMPOSITION_VERSION,
    ...compositionData(result.product),
  })

  return { outcome: 'found', product, fromCache: false }
}

/** Enriches products cached before composition support, once on first detail view. */
export async function enrichComposition(product: Product): Promise<Product> {
  if (
    product.source !== 'off' ||
    (product.compositionFetchedAt && product.compositionVersion === COMPOSITION_VERSION)
  ) {
    return product
  }

  const result = await requestProduct(product.barcode)
  if (result.outcome !== 'found') return product

  product.merge({
    nutriscore: nutriscore(result.product) ?? product.nutriscore,
    categoriesTags: result.product.categories_tags ?? product.categoriesTags,
    compositionFetchedAt: DateTime.now(),
    compositionVersion: COMPOSITION_VERSION,
    ...compositionData(result.product),
  })
  await product.save()
  return product
}

async function requestProduct(
  barcode: string
): Promise<
  { outcome: 'found'; product: OffProduct } | Exclude<LookupResult, { outcome: 'found' }>
> {
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

  if (payload.status !== 1 || !payload.product) return { outcome: 'not_found' }
  return { outcome: 'found', product: payload.product }
}

function compositionData(off: OffProduct) {
  const qualityAttributes = extractQualityAttributes(off.attribute_groups_fr) ?? {
    nutrition: null,
    nova: null,
    additives: null,
  }
  if (qualityAttributes?.additives) {
    const count = off.additives_tags?.length ?? 0
    qualityAttributes.additives.title =
      count === 0 ? 'Aucun additif déclaré' : `${count} additif${count > 1 ? 's' : ''}`
  }

  const hasIngredientEvidence = Boolean(
    off.ingredients_text_fr?.trim() || off.ingredients_text?.trim()
  )
  if (off.nova_group && hasIngredientEvidence) {
    qualityAttributes.nova ??= novaFallback(off.nova_group)
  }

  const hasQualityAttributes = Object.values(qualityAttributes).some(Boolean)

  return {
    ingredientsText: off.ingredients_text_fr?.trim() || off.ingredients_text?.trim() || null,
    allergensTags: off.allergens_tags ?? [],
    additivesTags: off.additives_tags ?? [],
    labelsTags: off.labels_tags ?? [],
    novaGroup: typeof off.nova_group === 'number' ? off.nova_group : null,
    nutrientLevels: extractNutrientLevels(off.nutrient_levels),
    nutriments: extractNutriments(off.nutriments),
    qualityAttributes: hasQualityAttributes ? qualityAttributes : null,
  }
}

function extractNutriments(raw: Record<string, unknown> | undefined): ProductNutriments | null {
  if (!raw) return null
  const result: ProductNutriments = {
    energyKcal: numberValue(raw['energy-kcal_100g']),
    fat: numberValue(raw.fat_100g),
    saturatedFat: numberValue(raw['saturated-fat_100g']),
    carbohydrates: numberValue(raw.carbohydrates_100g),
    sugars: numberValue(raw.sugars_100g),
    fiber: numberValue(raw.fiber_100g),
    proteins: numberValue(raw.proteins_100g),
    salt: numberValue(raw.salt_100g),
  }
  return Object.values(result).some((value) => value !== null) ? result : null
}

function extractNutrientLevels(
  raw: Record<string, unknown> | undefined
): ProductNutrientLevels | null {
  if (!raw) return null
  const result: ProductNutrientLevels = {}
  const fields = [
    ['fat', 'fat'],
    ['saturated-fat', 'saturatedFat'],
    ['sugars', 'sugars'],
    ['salt', 'salt'],
  ] as const

  for (const [source, target] of fields) {
    const value = raw[source]
    if (value === 'low' || value === 'moderate' || value === 'high') result[target] = value
  }
  return Object.keys(result).length > 0 ? result : null
}

function extractQualityAttributes(
  groups: OffProduct['attribute_groups_fr']
): ProductQualityAttributes | null {
  const attributes = groups?.flatMap((group) => group.attributes ?? []) ?? []
  const result: ProductQualityAttributes = {
    nutrition: qualityAttribute(attributes, 'nutriscore'),
    nova: qualityAttribute(attributes, 'nova'),
    additives: qualityAttribute(attributes, 'additives'),
  }
  return Object.values(result).some(Boolean) ? result : null
}

function qualityAttribute(attributes: OffAttribute[], id: string): ProductQualityAttribute | null {
  const attribute = attributes.find((candidate) => candidate.id === id)
  if (!attribute) return null
  return {
    status: attribute.status ?? 'unknown',
    score: numberValue(attribute.match),
    title: attribute.title?.trim() || null,
    description: attribute.description_short?.trim() || null,
    basis: id === 'additives' ? 'count' : 'official-match',
  }
}

function novaFallback(group: number): ProductQualityAttribute | null {
  const titles: Record<number, string> = {
    1: 'Peu transformé',
    2: 'Ingrédient culinaire transformé',
    3: 'Aliment transformé',
    4: 'Aliment ultra-transformé',
  }
  if (!titles[group]) return null

  return {
    status: 'known',
    score: [null, 100, 70, 35, 0][group] ?? null,
    title: `NOVA ${group} · ${titles[group]}`,
    description: null,
    basis: 'official-match',
  }
}

function productName(off: OffProduct) {
  return off.product_name_fr?.trim() || off.product_name?.trim() || null
}

function nutriscore(off: OffProduct) {
  return (off.nutriscore_grade || off.nutrition_grades)?.trim().toLowerCase().slice(0, 1) || null
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

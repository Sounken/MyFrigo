import Item, { type ItemLocation } from '#models/item'
import Product from '#models/product'
import { applyLocation, FALLBACK_DAYS, matchCategory } from '#services/shelf_life_rules'

/**
 * Guessing how long something will keep.
 *
 * A fixed shelf life per product does not survive contact with a supermarket:
 * the same yoghurt bought twice can have fifteen days left one week and seven
 * the next, depending on how long it sat on the shelf before you picked it up.
 *
 * So we never store "this product lasts N days". We store, on every single
 * item, how many days were left when it was scanned (`items.remaining_days`),
 * and we read that history back. The estimate is the median of what actually
 * happened, and the spread of past observations becomes the choices offered
 * at scan time — the guess converges on how *you* shop, not on an average.
 */

/** Enough history to be representative, recent enough to track a habit change. */
const HISTORY_SIZE = 12

/** Below this, min/max are noise around the median rather than real options. */
const SPREAD_THRESHOLD = 2

export type ExpirySuggestion = {
  days: number
  /** Pre-selected in the scan dialog: the one-tap answer. */
  primary: boolean
  hint: string | null
}

export type ExpiryEstimate = {
  defaultDays: number
  source: 'history' | 'category' | 'fallback'
  /** How many past purchases of this product we learned from. */
  observations: number
  min: number | null
  max: number | null
  suggestions: ExpirySuggestion[]
  /** The Open Food Facts category the rule came from, for the UI to explain itself. */
  categoryTag: string | null
}

/**
 * Lower median: with an even number of observations it returns a value that
 * was really measured, so every chip in the UI is a date you have actually
 * seen on this product rather than an average of two.
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

export async function estimate(
  product: Product,
  location: ItemLocation = 'fridge'
): Promise<ExpiryEstimate> {
  const history = await Item.query()
    .where('barcode', product.barcode)
    .orderBy('created_at', 'desc')
    .limit(HISTORY_SIZE * 2)

  const sameLocation = history.filter((item) => item.location === location)

  /**
   * Freezing overrides the printed date entirely, so how long this product
   * lasted in the fridge says nothing about it — and a single 180-day freezer
   * entry would wreck the fridge median just as badly the other way round.
   * The two pools stay separate.
   */
  if (location === 'freezer') {
    return sameLocation.length > 0
      ? fromHistory(sameLocation.slice(0, HISTORY_SIZE).map((item) => item.remainingDays))
      : fromCategory(product, location)
  }

  /**
   * Fridge and pantry are interchangeable enough to share observations, but
   * only fall back to the shared pool when this location has too little of
   * its own to be representative.
   */
  const ambient = history.filter((item) => item.location !== 'freezer')
  const relevant = (sameLocation.length >= 2 ? sameLocation : ambient).slice(0, HISTORY_SIZE)

  if (relevant.length > 0) {
    return fromHistory(relevant.map((item) => item.remainingDays))
  }

  return fromCategory(product, location)
}

function fromHistory(observations: number[]): ExpiryEstimate {
  const typical = median(observations)
  const min = Math.min(...observations)
  const max = Math.max(...observations)

  const suggestions: ExpirySuggestion[] = [
    {
      days: typical,
      primary: true,
      hint: observations.length === 1 ? 'la dernière fois' : 'habituel',
    },
  ]

  if (typical - min >= SPREAD_THRESHOLD) {
    suggestions.push({ days: min, primary: false, hint: 'au plus court' })
  }
  if (max - typical >= SPREAD_THRESHOLD) {
    suggestions.push({ days: max, primary: false, hint: 'au plus long' })
  }

  suggestions.sort((a, b) => a.days - b.days)

  return {
    defaultDays: typical,
    source: 'history',
    observations: observations.length,
    min,
    max,
    suggestions,
    categoryTag: null,
  }
}

function fromCategory(product: Product, location: ItemLocation): ExpiryEstimate {
  const match = matchCategory(product.categoriesTags ?? [])
  const days = applyLocation(match?.days ?? FALLBACK_DAYS, location)

  return {
    defaultDays: days,
    source: match ? 'category' : 'fallback',
    observations: 0,
    min: null,
    max: null,
    suggestions: [{ days, primary: true, hint: match ? 'estimation' : null }],
    categoryTag: match?.tag ?? null,
  }
}

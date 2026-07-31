import type { ItemLocation } from '#models/item'

/**
 * Typical days of shelf life left *at the moment you buy it* — not the
 * manufacturer's total shelf life. A yoghurt keeps ~30 days from the dairy,
 * but the pot you pick off the shelf usually has around three weeks on it.
 *
 * These numbers only matter for the very first scan of a product. From the
 * second one on, the estimator prefers what actually happened (see
 * `expiry_estimator.ts`), so being roughly right here is enough.
 *
 * Keys are Open Food Facts `categories_tags`.
 */
const RULES: Record<string, number> = {
  // Highly perishable
  'en:fresh-fish': 2,
  'en:seafood': 2,
  'en:ground-meat': 2,
  'en:minced-meats': 2,
  'en:sandwiches': 1,
  'en:fresh-meats': 3,
  'en:poultry': 3,
  'en:offals': 2,
  'en:prepared-salads': 4,
  'en:sushi': 1,

  // Dairy and eggs
  'en:fresh-milks': 7,
  'en:pasteurised-milks': 7,
  'en:uht-milks': 120,
  'en:milks': 60,
  'en:yogurts': 21,
  'en:fermented-milk-products': 21,
  'en:dairy-desserts': 21,
  'en:creams': 15,
  'en:fresh-creams': 12,
  'en:butters': 45,
  'en:eggs': 21,
  'en:cheeses': 21,
  'en:soft-cheeses': 14,
  'en:hard-cheeses': 45,
  'en:grated-cheeses': 21,

  // Deli and fresh convenience
  'en:charcuteries': 7,
  'en:hams': 7,
  'en:fresh-pastas': 10,
  'en:refrigerated-meals': 4,
  'en:doughs': 21,

  // Produce
  'en:fresh-vegetables': 7,
  'en:fresh-fruits': 7,
  'en:vegetables': 7,
  'en:fruits': 7,
  'en:salads': 4,
  'en:mushrooms': 5,
  'en:herbs': 5,
  'en:potatoes': 30,
  'en:onions': 30,
  'en:citrus': 14,
  'en:apples': 21,
  'en:bananas': 6,

  // Bakery
  'en:breads': 3,
  'en:fresh-breads': 2,
  'en:viennoiseries': 3,
  'en:pastries': 2,
  'en:rusks': 180,

  // Drinks
  'en:fresh-fruit-juices': 7,
  'en:fruit-juices': 180,
  'en:sodas': 270,
  'en:waters': 365,
  'en:beers': 270,
  'en:wines': 1095,
  'en:coffees': 365,
  'en:teas': 730,

  // Ambient pantry
  'en:canned-foods': 730,
  'en:canned-vegetables': 730,
  'en:canned-fish': 1095,
  'en:pastas': 540,
  'en:rices': 540,
  'en:legumes': 540,
  'en:flours': 270,
  'en:breakfast-cereals': 365,
  'en:biscuits': 180,
  'en:chocolates': 365,
  'en:confectioneries': 270,
  'en:snacks': 180,
  'en:sugars': 1095,
  'en:salts': 1825,
  'en:spices': 730,
  'en:condiments': 365,
  'en:sauces': 365,
  'en:oils': 365,
  'en:vinegars': 1095,
  'en:jams': 540,
  'en:honeys': 1095,
  'en:soups': 365,

  // Frozen
  'en:frozen-foods': 180,
  'en:frozen-vegetables': 270,
  'en:frozen-desserts': 180,
  'en:ice-creams': 180,
  'en:ice-creams-and-sorbets': 180,
  'en:pizzas': 180,

  // Spreads and breakfast
  'en:breakfasts': 300,
  'en:spreads': 240,
  'en:sweet-spreads': 240,
  'en:salty-spreads': 90,
  'en:confectionary-based-spreads': 240,
  'en:chocolate-spreads': 240,
  'en:hazelnut-spreads': 240,
  'en:nut-butters': 300,

  /**
   * Generic families, matched only when nothing more specific hits. Without
   * these, anything Open Food Facts classifies loosely — which is a lot —
   * would fall through to the 7-day default and be wrong by a year.
   */
  'en:groceries': 365,
  'en:cereals-and-potatoes': 365,
  'en:cereals-and-their-products': 365,
  'en:plant-based-foods': 30,
  'en:plant-based-foods-and-beverages': 90,
  'en:beverages': 180,
  'en:dairies': 14,
  'en:meats': 3,
  'en:meats-and-their-products': 5,
  'en:prepared-meats': 7,
  'en:fishes': 2,
  'en:fishes-and-their-products': 3,
  'en:desserts': 14,
  'en:cakes': 14,
  'en:biscuits-and-cakes': 180,
  'en:sweet-snacks': 240,
  'en:salty-snacks': 120,
  'en:candies': 365,
  'en:meals': 5,
  'en:frozen': 180,
}

/** Used when nothing else is known: a week is short enough to stay visible. */
export const FALLBACK_DAYS = 7

/**
 * A freezer overrides whatever the category says — anything you freeze keeps
 * for months, and the printed date stops being the binding constraint.
 */
const FREEZER_MINIMUM_DAYS = 180

export type CategoryMatch = { days: number; tag: string } | null

/**
 * Open Food Facts orders `categories_tags` from generic to specific
 * ("en:dairies" … "en:yogurts"), so we walk it backwards and take the first
 * tag we have a rule for: the most specific match wins.
 */
export function matchCategory(categoriesTags: string[]): CategoryMatch {
  for (let i = categoriesTags.length - 1; i >= 0; i--) {
    const tag = categoriesTags[i]
    if (tag in RULES) {
      return { days: RULES[tag], tag }
    }
  }
  return null
}

export function applyLocation(days: number, location: ItemLocation): number {
  if (location === 'freezer') {
    return Math.max(days, FREEZER_MINIMUM_DAYS)
  }
  return days
}

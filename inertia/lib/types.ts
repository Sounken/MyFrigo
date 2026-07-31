export type ItemLocation = 'fridge' | 'freezer' | 'pantry'
export type ItemStatus = 'in_stock' | 'consumed' | 'trashed'

export type InventoryItem = {
  id: number
  barcode: string
  name: string
  brands: string | null
  quantityLabel: string | null
  imageUrl: string | null
  expiresAt: string
  daysLeft: number
  location: ItemLocation
  status: ItemStatus
  resolvedAt: string | null
}

export type ScannedProduct = {
  barcode: string
  name: string
  brands: string | null
  quantityLabel: string | null
  imageUrl: string | null
  nutriscore: string | null
  source: 'off' | 'manual' | 'weighed'
}

export type ExpirySuggestion = {
  days: number
  primary: boolean
  hint: string | null
}

export type ExpiryEstimate = {
  defaultDays: number
  source: 'history' | 'category' | 'fallback'
  observations: number
  min: number | null
  max: number | null
  suggestions: ExpirySuggestion[]
  categoryTag: string | null
}

export type ResolutionStats = {
  consumed: number
  trashed: number
  total: number
  wasteRate: number
}

export type WasteStats = {
  allTime: ResolutionStats
  last30Days: ResolutionStats
  inventory: {
    total: number
    urgent: number
    expired: number
  }
  topWasted: { name: string; count: number }[]
}

export type ProductDetails = {
  barcode: string
  name: string
  brands: string | null
  quantityLabel: string | null
  imageUrl: string | null
  nutriscore: string | null
  source: 'off' | 'manual' | 'weighed'
  ingredientsText: string | null
  allergensTags: string[]
  additivesTags: string[]
  labelsTags: string[]
  novaGroup: number | null
  nutrientLevels: Partial<
    Record<'fat' | 'saturatedFat' | 'sugars' | 'salt', 'low' | 'moderate' | 'high'>
  > | null
  nutriments: {
    energyKcal: number | null
    fat: number | null
    saturatedFat: number | null
    carbohydrates: number | null
    sugars: number | null
    fiber: number | null
    proteins: number | null
    salt: number | null
  } | null
  quality: {
    score: number | null
    coverage: number
    partial: boolean
    label: string | null
    components: {
      id: 'nutrition' | 'nova' | 'additives'
      label: string
      weight: number
      score: number | null
      status: 'known' | 'unknown' | 'not-applicable' | 'missing'
      title: string | null
      description: string | null
    }[]
  }
  compositionAvailable: boolean
}

export type ProductExpiryProfile = {
  location: ItemLocation
  defaultDays: number
  source: 'history' | 'category' | 'fallback'
  observations: number
  min: number | null
  max: number | null
}

export type RecipeIngredient = {
  id: number
  barcode: string
  name: string
  daysLeft: number
}

export type RecipeSuggestion = {
  id: string
  title: string
  emoji: string
  description: string
  ingredients: RecipeIngredient[]
  complements: string[]
  steps: string[]
  urgencyScore: number
}

export type ScanResolution =
  | {
      status: 'found'
      barcode: string
      product: ScannedProduct
      estimate: ExpiryEstimate
      fromCache: boolean
    }
  | { status: 'unknown'; barcode: string; reason: string; estimate: ExpiryEstimate }
  | { status: 'weighed'; barcode: string; suggestions: ScannedProduct[] }
  | { status: 'invalid'; message: string }

export const LOCATION_LABELS: Record<ItemLocation, string> = {
  fridge: 'Frigo',
  freezer: 'Congélateur',
  pantry: 'Placard',
}

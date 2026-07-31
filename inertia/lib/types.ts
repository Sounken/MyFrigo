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

export type ShoppingItem = {
  id: number
  name: string
  barcode: string | null
  checked: boolean
  createdAt: string
}

export type ShoppingSuggestion = {
  name: string
  barcode: string
  timesUsed: number
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

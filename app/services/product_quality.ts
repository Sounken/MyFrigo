import type { ProductQualityAttribute, ProductQualityAttributes } from '#models/product'

export type QualityComponent = {
  id: 'nutrition' | 'nova' | 'additives'
  label: string
  weight: number
  score: number | null
  status: ProductQualityAttribute['status'] | 'missing'
  title: string | null
  description: string | null
}

export type ProductQuality = {
  score: number | null
  coverage: number
  partial: boolean
  label: string | null
  components: QualityComponent[]
}

const COMPONENTS = [
  { id: 'nutrition', label: 'Qualité nutritionnelle', weight: 60 },
  { id: 'nova', label: 'Transformation', weight: 20 },
  { id: 'additives', label: 'Additifs', weight: 20 },
] as const

/**
 * A transparent index, not a medical verdict and not Yuka's proprietary score.
 * Open Food Facts supplies each 0–100 component; we only apply the displayed weights.
 */
export function calculateProductQuality(
  attributes: ProductQualityAttributes | null
): ProductQuality {
  const components: QualityComponent[] = COMPONENTS.map((definition) => {
    const attribute = attributes?.[definition.id] ?? null
    const known = attribute?.status === 'known' && attribute.score !== null
    return {
      ...definition,
      score: known ? clamp(attribute.score!) : null,
      status: attribute?.status ?? 'missing',
      title: attribute?.title ?? null,
      description: attribute?.description ?? null,
    }
  })

  const nutritionKnown = components[0].score !== null
  const known = components.filter((component) => component.score !== null)
  const knownWeight = known.reduce((total, component) => total + component.weight, 0)
  const coverage = knownWeight

  if (!nutritionKnown || knownWeight === 0) {
    return { score: null, coverage, partial: true, label: null, components }
  }

  const score = Math.round(
    known.reduce((total, component) => total + component.score! * component.weight, 0) / knownWeight
  )

  return {
    score,
    coverage,
    partial: coverage < 100,
    label: qualityLabel(score),
    components,
  }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value))
}

function qualityLabel(score: number) {
  if (score >= 75) return 'Très bon'
  if (score >= 50) return 'Bon'
  if (score >= 25) return 'À limiter'
  return 'Faible'
}

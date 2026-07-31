export type AdditiveRiskLevel = 'low' | 'attention' | 'dangerous' | 'unknown'

export type AdditiveInfo = {
  code: string
  name: string
  functionLabel: string
  riskLevel: AdditiveRiskLevel
  riskLabel: string
  description: string
  sourceUrl: string
}

const EU_DATABASE_URL =
  'https://food.ec.europa.eu/food-safety/food-improvement-agents/additives/database_en'

/**
 * Small curated layer for the common additives seen in French products.
 * Unknown entries remain explicitly unknown: an E-number alone is not a
 * toxicology classification. The EU database and EFSA remain the sources of truth.
 */
const KNOWN: Record<string, Omit<AdditiveInfo, 'code' | 'sourceUrl'>> = {
  e300: {
    name: 'Acide ascorbique (vitamine C)',
    functionLabel: 'Antioxydant',
    riskLevel: 'low',
    riskLabel: 'Faible · autorisé sous conditions',
    description:
      'Antioxydant utilisé pour limiter l’oxydation. Son emploi est encadré par la réglementation européenne.',
  },
  e322: {
    name: 'Lécithines',
    functionLabel: 'Émulsifiant',
    riskLevel: 'low',
    riskLabel: 'Faible · autorisé sous conditions',
    description:
      'Émulsifiant qui aide des ingrédients comme l’eau et les matières grasses à rester mélangés. Il peut provenir notamment du soja ou de l’œuf.',
  },
  e330: {
    name: 'Acide citrique',
    functionLabel: 'Correcteur d’acidité',
    riskLevel: 'low',
    riskLabel: 'Faible · autorisé sous conditions',
    description:
      'Correcteur d’acidité et antioxydant naturellement présent dans de nombreux fruits.',
  },
  e407: {
    name: 'Carraghénanes',
    functionLabel: 'Gélifiant / épaississant',
    riskLevel: 'attention',
    riskLabel: 'Moyen · à surveiller',
    description:
      'Épaississant extrait d’algues. Son évaluation dépend de la forme utilisée et des conditions d’exposition ; MyFrigo ne le présente pas comme dangereux au seul vu de son numéro E.',
  },
  e471: {
    name: 'Mono- et diglycérides d’acides gras',
    functionLabel: 'Émulsifiant / stabilisant',
    riskLevel: 'attention',
    riskLabel: 'Moyen · évaluation à vérifier',
    description:
      'Émulsifiant utilisé pour stabiliser la texture. La fiche invite à consulter l’évaluation actuelle plutôt qu’à conclure automatiquement à un danger.',
  },
  e500: {
    name: 'Carbonates de sodium',
    functionLabel: 'Agent levant / correcteur d’acidité',
    riskLevel: 'low',
    riskLabel: 'Faible · autorisé sous conditions',
    description:
      'Famille de carbonates utilisée notamment comme agent levant et correcteur d’acidité. E500 ne signifie pas « dangereux » : les usages autorisés sont encadrés dans l’Union européenne.',
  },
}

export function describeAdditives(tags: string[]): AdditiveInfo[] {
  const unique = new Map<string, AdditiveInfo>()
  for (const tag of tags) {
    const additive = describeAdditive(tag)
    unique.set(additive.code, additive)
  }
  return [...unique.values()]
}

function describeAdditive(tag: string): AdditiveInfo {
  const code = normalizeCode(tag)
  const known = KNOWN[code]
  if (known) return { code, ...known, sourceUrl: `${EU_DATABASE_URL}#${code}` }

  const numeric = Number(code.slice(1))
  return {
    code,
    name: `Additif ${code}`,
    functionLabel: functionFromRange(numeric),
    riskLevel: 'unknown',
    riskLabel: 'Non classifié',
    description:
      'MyFrigo connaît la présence de cet additif, mais ne dispose pas encore d’une synthèse de risque suffisamment documentée. Consulte la fiche officielle pour les conditions d’emploi et les évaluations disponibles.',
    sourceUrl: `${EU_DATABASE_URL}#${code}`,
  }
}

function normalizeCode(tag: string) {
  const match = tag.toLowerCase().match(/e\d{3,4}/)
  return match ? match[0].toUpperCase().replace('E', 'e') : tag.toUpperCase()
}

function functionFromRange(number: number) {
  if (number >= 100 && number < 200) return 'Colorant'
  if (number >= 200 && number < 300) return 'Conservateur'
  if (number >= 300 && number < 400) return 'Antioxydant / correcteur d’acidité'
  if (number >= 400 && number < 500) return 'Épaississant / stabilisant / émulsifiant'
  if (number >= 500 && number < 600) return 'Correcteur d’acidité / agent levant'
  if (number >= 600 && number < 700) return 'Exhausteur de goût'
  if (number >= 900 && number < 1000) return 'Édulcorant / agent d’enrobage'
  return 'Fonction à vérifier'
}

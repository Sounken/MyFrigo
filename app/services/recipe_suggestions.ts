export type RecipeInput = {
  id: number
  barcode: string
  name: string
  categoriesTags: string[]
  daysLeft: number
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

type FoodFamily =
  | 'egg'
  | 'cheese'
  | 'meat'
  | 'fish'
  | 'tofu'
  | 'vegetable'
  | 'salad_leaf'
  | 'cooking_green'
  | 'potato'
  | 'dairy'
  | 'pasta'
  | 'sauce'
  | 'grain'
  | 'fruit'
  | 'sweet_spread'

type IngredientSlot = {
  families: FoodFamily[]
  required?: boolean
}

type RecipeTemplate = Omit<RecipeSuggestion, 'ingredients' | 'urgencyScore'> & {
  slots: IngredientSlot[]
}

const TEMPLATES: RecipeTemplate[] = [
  {
    id: 'omelette',
    title: 'Omelette anti-gaspi',
    emoji: '🍳',
    description: 'Une base rapide qui accepte très bien fromage, légumes et restes de viande.',
    slots: [
      { families: ['egg'], required: true },
      { families: ['cheese'] },
      { families: ['meat', 'fish', 'tofu'] },
      { families: ['vegetable', 'cooking_green'] },
    ],
    complements: ['sel', 'poivre', 'un peu d’huile'],
    steps: [
      'Couper et faire revenir les garnitures les plus fragiles.',
      'Battre les œufs, assaisonner puis verser dans la poêle.',
      'Ajouter le fromage, replier et servir dès que le centre est pris.',
    ],
  },
  {
    id: 'soup',
    title: 'Soupe des légumes à sauver',
    emoji: '🥣',
    description: 'Idéale pour utiliser plusieurs légumes en une fois, même un peu fatigués.',
    slots: [
      { families: ['vegetable', 'cooking_green'], required: true },
      { families: ['potato'] },
      { families: ['dairy'] },
      { families: ['vegetable'] },
    ],
    complements: ['eau ou bouillon', 'sel', 'poivre'],
    steps: [
      'Laver les légumes et les couper en morceaux réguliers.',
      'Couvrir de bouillon et cuire environ 20 minutes.',
      'Mixer, ajuster la texture et terminer avec la crème ou le lait disponible.',
    ],
  },
  {
    id: 'gratin',
    title: 'Gratin fond de frigo',
    emoji: '🧀',
    description: 'Un plat généreux pour réunir légumes, crème et fromage proches de leur date.',
    slots: [
      { families: ['potato', 'vegetable', 'cooking_green'], required: true },
      { families: ['cheese'], required: true },
      { families: ['dairy'] },
      { families: ['meat', 'fish', 'tofu'] },
    ],
    complements: ['sel', 'poivre', 'muscade'],
    steps: [
      'Précuire les légumes fermes et déposer le tout dans un plat.',
      'Ajouter crème ou lait, assaisonner puis couvrir de fromage.',
      'Gratiner 20 à 30 minutes à 190 °C.',
    ],
  },
  {
    id: 'salad',
    title: 'Salade complète minute',
    emoji: '🥗',
    description: 'Fraîche et modulable, à composer d’abord avec les produits les plus urgents.',
    slots: [
      { families: ['salad_leaf', 'vegetable'], required: true },
      { families: ['meat', 'fish', 'tofu'] },
      { families: ['cheese'] },
      { families: ['egg'] },
    ],
    complements: ['huile', 'vinaigre ou citron', 'sel', 'poivre'],
    steps: [
      'Laver, essorer et découper tous les produits disponibles.',
      'Ajouter la protéine et le fromage en petits morceaux.',
      'Assaisonner juste avant de servir.',
    ],
  },
  {
    id: 'pasta',
    title: 'Pâtes crémeuses improvisées',
    emoji: '🍝',
    description: 'Une sauce minute pour écouler légumes, fromage ou restes de viande.',
    slots: [
      { families: ['pasta'], required: true },
      { families: ['sauce', 'dairy'] },
      { families: ['cheese'] },
      { families: ['vegetable', 'cooking_green'] },
      { families: ['meat', 'fish', 'tofu'] },
    ],
    complements: ['sel', 'poivre', 'un peu d’huile'],
    steps: [
      'Cuire les pâtes et garder une petite louche d’eau de cuisson.',
      'Faire revenir les garnitures puis ajouter la base de sauce.',
      'Mélanger avec les pâtes et détendre avec l’eau réservée.',
    ],
  },
  {
    id: 'smoothie',
    title: 'Smoothie ou bowl fruité',
    emoji: '🥤',
    description: 'Le réflexe express pour utiliser les fruits très mûrs et les laitages ouverts.',
    slots: [{ families: ['fruit'], required: true }, { families: ['dairy'] }],
    complements: ['quelques glaçons', 'miel (facultatif)'],
    steps: [
      'Éplucher ou équeuter les fruits et retirer les parties abîmées.',
      'Mixer avec le laitage jusqu’à obtenir la texture souhaitée.',
      'Servir immédiatement, en verre ou en bowl.',
    ],
  },
  {
    id: 'skillet',
    title: 'Poêlée anti-gaspi',
    emoji: '🍲',
    description: 'Une cuisson unique et souple pour transformer les restes en vrai repas.',
    slots: [
      { families: ['meat', 'fish', 'tofu'], required: true },
      { families: ['vegetable', 'cooking_green'] },
      { families: ['grain', 'potato'] },
      { families: ['sauce', 'dairy'] },
    ],
    complements: ['huile', 'sel', 'poivre', 'épices au choix'],
    steps: [
      'Saisir la protéine en morceaux dans une grande poêle.',
      'Ajouter les légumes du plus ferme au plus tendre.',
      'Incorporer la garniture ou la sauce, assaisonner et servir bien chaud.',
    ],
  },
]

export function suggestRecipes(input: RecipeInput[], limit = 5): RecipeSuggestion[] {
  const products = deduplicate(input)

  const suggestions = TEMPLATES.map((template) => matchTemplate(template, products))
    .filter((recipe): recipe is RecipeSuggestion => recipe !== null)
    .sort((a, b) => b.urgencyScore - a.urgencyScore || b.ingredients.length - a.ingredients.length)
    .slice(0, limit)

  return suggestions
}

function matchTemplate(template: RecipeTemplate, products: RecipeInput[]): RecipeSuggestion | null {
  const used = new Set<string>()
  const ingredients: RecipeInput[] = []

  for (const slot of template.slots) {
    const candidate = products
      .filter((product) => !used.has(product.barcode) && matches(product, slot.families))
      .sort((a, b) => a.daysLeft - b.daysLeft)[0]

    if (!candidate && slot.required) return null
    if (!candidate) continue

    used.add(candidate.barcode)
    ingredients.push(candidate)
  }

  if (ingredients.length === 0) return null

  return {
    id: template.id,
    title: template.title,
    emoji: template.emoji,
    description: template.description,
    ingredients: ingredients.map(asIngredient),
    complements: template.complements,
    steps: template.steps,
    urgencyScore:
      ingredients.reduce((score, item) => score + urgencyPoints(item.daysLeft), 0) +
      ingredients.length * 4,
  }
}

const FAMILY_TERMS: Record<FoodFamily, string[]> = {
  egg: ['oeuf', 'oeufs', 'egg', 'eggs'],
  cheese: [
    'fromage',
    'fromages',
    'cheese',
    'cheeses',
    'emmental',
    'comte',
    'mozzarella',
    'parmesan',
    'feta',
    'chevre',
  ],
  meat: [
    'viande',
    'meat',
    'poulet',
    'chicken',
    'boeuf',
    'porc',
    'jambon',
    'ham',
    'lardon',
    'saucisse',
  ],
  fish: ['poisson', 'fish', 'thon', 'tuna', 'saumon', 'salmon'],
  tofu: ['tofu'],
  vegetable: [
    'legume',
    'legumes',
    'vegetable',
    'vegetables',
    'carotte',
    'courgette',
    'poireau',
    'potiron',
    'courge',
    'brocoli',
    'chou',
    'champignon',
    'tomate',
    'concombre',
    'avocat',
    'poivron',
    'oignon',
    'ail',
  ],
  salad_leaf: ['salade', 'salades', 'lettuce', 'roquette', 'mache'],
  cooking_green: ['epinard', 'epinards', 'spinach', 'bette', 'blette', 'kale'],
  potato: ['pomme de terre', 'pommes de terre', 'potato', 'potatoes', 'patate', 'patates'],
  dairy: ['lait', 'milk', 'creme', 'cream', 'yaourt', 'yaourts', 'yogurt', 'yogurts'],
  pasta: [
    'pates',
    'pasta',
    'pastas',
    'spaghetti',
    'spaghettis',
    'tagliatelle',
    'tagliatelles',
    'macaroni',
    'penne',
  ],
  sauce: ['sauce', 'sauces', 'pesto', 'coulis'],
  grain: ['riz', 'rice', 'semoule', 'couscous', 'quinoa', 'boulgour'],
  fruit: [
    'fruit',
    'fruits',
    'banane',
    'bananes',
    'pomme',
    'pommes',
    'poire',
    'poires',
    'fraise',
    'fraises',
    'framboise',
    'framboises',
    'mangue',
    'mangues',
  ],
  sweet_spread: ['pate a tartiner', 'pates a tartiner', 'sweet spread', 'sweet spreads'],
}

function matches(product: RecipeInput, families: FoodFamily[]) {
  const productFamilies = classify(product)
  return families.some((family) => productFamilies.has(family))
}

function classify(product: RecipeInput) {
  const text = normalize([product.name, ...product.categoriesTags].join(' '))
  const families = new Set<FoodFamily>()

  for (const [family, terms] of Object.entries(FAMILY_TERMS) as [FoodFamily, string[]][]) {
    if (terms.some((term) => containsTerm(text, term))) families.add(family)
  }

  /** "Pâte à tartiner" is a spread, never a packet of pasta. */
  if (families.has('sweet_spread')) families.delete('pasta')
  return families
}

function containsTerm(text: string, term: string) {
  return ` ${text} `.includes(` ${normalize(term)} `)
}

function deduplicate(input: RecipeInput[]) {
  const products = new Map<string, RecipeInput>()

  for (const item of input) {
    const existing = products.get(item.barcode)
    if (!existing || item.daysLeft < existing.daysLeft) products.set(item.barcode, item)
  }

  return [...products.values()]
}

function asIngredient(item: RecipeInput): RecipeIngredient {
  return {
    id: item.id,
    barcode: item.barcode,
    name: item.name,
    daysLeft: item.daysLeft,
  }
}

function urgencyPoints(daysLeft: number) {
  if (daysLeft < 0) return 24
  if (daysLeft === 0) return 20
  if (daysLeft <= 2) return 12
  if (daysLeft <= 7) return 5
  return 0
}

function normalize(value: string) {
  return value
    .replaceAll('œ', 'oe')
    .replaceAll('Œ', 'Oe')
    .replaceAll('æ', 'ae')
    .replaceAll('Æ', 'Ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

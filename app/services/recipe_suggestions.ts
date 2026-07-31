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

type IngredientSlot = {
  keywords: string[]
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
      { keywords: ['oeuf', 'egg'], required: true },
      { keywords: ['fromage', 'cheese', 'emmental', 'comte', 'mozzarella'] },
      { keywords: ['jambon', 'ham', 'lardon', 'poulet'] },
      { keywords: ['epinard', 'champignon', 'tomate', 'courgette', 'poivron'] },
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
      {
        keywords: [
          'carotte',
          'courgette',
          'poireau',
          'potiron',
          'courge',
          'brocoli',
          'chou',
          'legume',
          'vegetable',
        ],
        required: true,
      },
      { keywords: ['pomme de terre', 'potato', 'patate'] },
      { keywords: ['creme', 'lait', 'cream', 'milk'] },
      { keywords: ['oignon', 'ail'] },
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
      {
        keywords: ['pomme de terre', 'courgette', 'epinard', 'brocoli', 'chou fleur', 'legume'],
        required: true,
      },
      { keywords: ['fromage', 'cheese', 'emmental', 'comte', 'mozzarella'], required: true },
      { keywords: ['creme', 'lait', 'cream', 'milk'] },
      { keywords: ['jambon', 'lardon', 'poulet'] },
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
      {
        keywords: ['salade', 'lettuce', 'tomate', 'concombre', 'avocat', 'carotte'],
        required: true,
      },
      { keywords: ['poulet', 'jambon', 'thon', 'saumon', 'tofu'] },
      { keywords: ['fromage', 'feta', 'mozzarella', 'chevre'] },
      { keywords: ['oeuf', 'egg'] },
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
      { keywords: ['pate', 'pasta', 'spaghetti', 'tagliatelle'], required: true },
      { keywords: ['tomate', 'sauce tomate', 'creme', 'pesto'] },
      { keywords: ['fromage', 'parmesan', 'emmental', 'mozzarella'] },
      { keywords: ['courgette', 'epinard', 'champignon', 'poivron', 'brocoli'] },
      { keywords: ['poulet', 'jambon', 'lardon', 'saumon'] },
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
    slots: [
      {
        keywords: ['banane', 'pomme', 'poire', 'fraise', 'framboise', 'mangue', 'fruit'],
        required: true,
      },
      { keywords: ['yaourt', 'yogurt', 'lait', 'milk', 'boisson vegetale'] },
    ],
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
      {
        keywords: ['poulet', 'boeuf', 'porc', 'saucisse', 'tofu', 'poisson'],
        required: true,
      },
      { keywords: ['courgette', 'carotte', 'poivron', 'champignon', 'brocoli', 'legume'] },
      { keywords: ['riz', 'rice', 'semoule', 'quinoa', 'pomme de terre'] },
      { keywords: ['creme', 'sauce tomate', 'pesto'] },
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

  if (suggestions.length > 0 || products.length === 0) return suggestions

  const urgent = [...products].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4)
  return [
    {
      id: 'freeform',
      title: 'Assiette anti-gaspi',
      emoji: '✨',
      description: 'Une proposition libre construite avec les produits à utiliser en premier.',
      ingredients: urgent.map(asIngredient),
      complements: ['huile ou beurre', 'sel', 'poivre', 'épices au choix'],
      steps: [
        'Couper les produits en portions adaptées à leur temps de cuisson.',
        'Cuire d’abord les ingrédients fermes, puis ajouter les plus fragiles.',
        'Assaisonner, goûter et servir sous forme de poêlée, salade ou tartine.',
      ],
      urgencyScore: urgent.reduce((score, item) => score + urgencyPoints(item.daysLeft), 0),
    },
  ]
}

function matchTemplate(template: RecipeTemplate, products: RecipeInput[]): RecipeSuggestion | null {
  const used = new Set<string>()
  const ingredients: RecipeInput[] = []

  for (const slot of template.slots) {
    const candidate = products
      .filter((product) => !used.has(product.barcode) && matches(product, slot.keywords))
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

function matches(product: RecipeInput, keywords: string[]) {
  const haystack = normalize([product.name, ...product.categoriesTags].join(' '))
  return keywords.some((keyword) => haystack.includes(normalize(keyword)))
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
}

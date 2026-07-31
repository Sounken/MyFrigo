import { test } from '@japa/runner'
import { suggestRecipes, type RecipeInput } from '#services/recipe_suggestions'

function item(overrides: Partial<RecipeInput> & Pick<RecipeInput, 'id' | 'barcode' | 'name'>) {
  return {
    categoriesTags: [],
    daysLeft: 10,
    ...overrides,
  }
}

test.group('Recipe suggestions', () => {
  test('builds recipes from names and Open Food Facts categories', ({ assert }) => {
    const recipes = suggestRecipes([
      item({ id: 1, barcode: 'eggs', name: 'Œufs plein air', daysLeft: 2 }),
      item({ id: 2, barcode: 'cheese', name: 'Comté', categoriesTags: ['en:cheeses'] }),
      item({ id: 3, barcode: 'spinach', name: 'Épinards frais', daysLeft: 0 }),
    ])

    const omelette = recipes.find((recipe) => recipe.id === 'omelette')
    assert.exists(omelette)
    assert.deepEqual(
      omelette?.ingredients.map((ingredient) => ingredient.name),
      ['Œufs plein air', 'Comté', 'Épinards frais']
    )
  })

  test('prioritizes recipes that save urgent products', ({ assert }) => {
    const recipes = suggestRecipes([
      item({ id: 1, barcode: 'pasta', name: 'Spaghetti', daysLeft: 200 }),
      item({ id: 2, barcode: 'tomato', name: 'Sauce tomate', daysLeft: 100 }),
      item({ id: 3, barcode: 'banana', name: 'Bananes', daysLeft: 0 }),
      item({ id: 4, barcode: 'yogurt', name: 'Yaourt nature', daysLeft: 1 }),
    ])

    assert.equal(recipes[0].id, 'smoothie')
  })

  test('does not invent a recipe when no compatible template matches', ({ assert }) => {
    const recipes = suggestRecipes([
      item({ id: 1, barcode: 'mystery', name: 'Produit maison', daysLeft: 3 }),
    ])

    assert.isEmpty(recipes)
  })

  test('never mistakes chocolate spread for pasta', ({ assert }) => {
    const withoutPasta = suggestRecipes([
      item({
        id: 1,
        barcode: 'nutella',
        name: 'Nutella',
        categoriesTags: ['fr:pates-a-tartiner', 'en:sweet-spreads'],
      }),
      item({ id: 2, barcode: 'tomato', name: 'Sauce tomate' }),
      item({ id: 3, barcode: 'cheese', name: 'Parmesan' }),
    ])

    assert.notInclude(
      withoutPasta.map((recipe) => recipe.id),
      'pasta'
    )

    const withPasta = suggestRecipes([
      item({ id: 4, barcode: 'spaghetti', name: 'Spaghetti' }),
      item({
        id: 1,
        barcode: 'nutella',
        name: 'Nutella',
        categoriesTags: ['fr:pates-a-tartiner', 'en:sweet-spreads'],
      }),
      item({ id: 2, barcode: 'tomato', name: 'Sauce tomate' }),
      item({ id: 3, barcode: 'cheese', name: 'Parmesan' }),
    ])
    const pasta = withPasta.find((recipe) => recipe.id === 'pasta')
    assert.exists(pasta)
    assert.isFalse(pasta!.ingredients.some((ingredient) => ingredient.barcode === 'nutella'))
  })

  test('does not use green salad in cooked soup or gratin', ({ assert }) => {
    const recipes = suggestRecipes([
      item({ id: 1, barcode: 'lettuce', name: 'Salade mêlée' }),
      item({ id: 2, barcode: 'cheese', name: 'Comté' }),
      item({ id: 3, barcode: 'milk', name: 'Lait' }),
    ])

    assert.notInclude(
      recipes.map((recipe) => recipe.id),
      'gratin'
    )
    assert.notInclude(
      recipes.map((recipe) => recipe.id),
      'soup'
    )
  })
})

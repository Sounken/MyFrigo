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

  test('offers a freeform fallback when no template matches', ({ assert }) => {
    const recipes = suggestRecipes([
      item({ id: 1, barcode: 'mystery', name: 'Produit maison', daysLeft: 3 }),
    ])

    assert.equal(recipes[0].id, 'freeform')
    assert.equal(recipes[0].ingredients[0].name, 'Produit maison')
  })
})

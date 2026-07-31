import type { HttpContext } from '@adonisjs/core/http'
import Item from '#models/item'
import { suggestRecipes } from '#services/recipe_suggestions'

export default class RecipesController {
  async index({ inertia }: HttpContext) {
    const items = await Item.query()
      .where('status', 'in_stock')
      .preload('product')
      .orderBy('expires_at', 'asc')

    const recipes = suggestRecipes(
      items.map((item) => ({
        id: item.id,
        barcode: item.barcode,
        name: item.product.name,
        categoriesTags: item.product.categoriesTags ?? [],
        daysLeft: item.daysLeft,
      }))
    )

    return inertia.render('recipes', {
      recipes,
      urgentItems: items
        .filter((item) => item.daysLeft <= 4)
        /** One card per product, even when several identical pots are in stock. */
        .filter(
          (item, index, urgent) =>
            urgent.findIndex((candidate) => candidate.barcode === item.barcode) === index
        )
        .slice(0, 8)
        .map((item) => ({
          id: item.id,
          barcode: item.barcode,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          daysLeft: item.daysLeft,
        })),
      inventoryCount: items.length,
    })
  }
}

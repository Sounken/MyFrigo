import type { HttpContext } from '@adonisjs/core/http'
import Item, { type ItemLocation } from '#models/item'
import Product from '#models/product'
import { serializeItem } from '#controllers/items_controller'
import { estimate } from '#services/expiry_estimator'
import { enrichComposition } from '#services/open_food_facts'
import { calculateProductQuality } from '#services/product_quality'

const LOCATIONS: ItemLocation[] = ['fridge', 'freezer', 'pantry']

export default class ProductsController {
  async show({ params, inertia }: HttpContext) {
    let product = await Product.findOrFail(params.barcode)
    product = await enrichComposition(product)

    const stock = await Item.query()
      .where('barcode', product.barcode)
      .where('status', 'in_stock')
      .preload('product')
      .orderBy('expires_at', 'asc')

    const resolved = await Item.query()
      .where('barcode', product.barcode)
      .whereIn('status', ['consumed', 'trashed'])
      .preload('product')
      .orderBy('resolved_at', 'desc')

    const expiryProfiles = []
    for (const location of LOCATIONS) {
      const profile = await estimate(product, location)
      expiryProfiles.push({
        location,
        defaultDays: profile.defaultDays,
        source: profile.source,
        observations: profile.observations,
        min: profile.min,
        max: profile.max,
      })
    }

    return inertia.render('product', {
      product: {
        barcode: product.barcode,
        name: product.name,
        brands: product.brands,
        quantityLabel: product.quantityLabel,
        imageUrl: product.imageUrl,
        nutriscore: product.nutriscore,
        source: product.source,
        ingredientsText: product.ingredientsText,
        allergensTags: product.allergensTags ?? [],
        additivesTags: product.additivesTags ?? [],
        labelsTags: product.labelsTags ?? [],
        novaGroup: product.novaGroup,
        nutrientLevels: product.nutrientLevels,
        nutriments: product.nutriments,
        quality: calculateProductQuality(product.qualityAttributes),
        compositionAvailable: Boolean(
          product.ingredientsText || product.nutriments || product.qualityAttributes
        ),
      },
      stock: stock.map(serializeItem),
      recentHistory: resolved.slice(0, 12).map(serializeItem),
      stats: {
        consumed: resolved.filter((item) => item.status === 'consumed').length,
        trashed: resolved.filter((item) => item.status === 'trashed').length,
      },
      expiryProfiles,
    })
  }
}

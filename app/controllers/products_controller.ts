import type { HttpContext } from '@adonisjs/core/http'
import Item, { type ItemLocation } from '#models/item'
import Product from '#models/product'
import { serializeItem } from '#controllers/items_controller'
import { estimate } from '#services/expiry_estimator'

const LOCATIONS: ItemLocation[] = ['fridge', 'freezer', 'pantry']

export default class ProductsController {
  async show({ params, inertia }: HttpContext) {
    const product = await Product.findOrFail(params.barcode)

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

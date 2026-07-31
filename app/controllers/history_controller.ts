import type { HttpContext } from '@adonisjs/core/http'
import Item from '#models/item'
import { serializeItem } from '#controllers/items_controller'

export default class HistoryController {
  async index({ inertia }: HttpContext) {
    const items = await Item.query()
      .whereIn('status', ['consumed', 'trashed'])
      .whereNotNull('resolved_at')
      .preload('product')
      .orderBy('resolved_at', 'desc')
      .limit(200)

    return inertia.render('history', { items: items.map(serializeItem) })
  }
}

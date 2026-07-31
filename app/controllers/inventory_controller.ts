import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Item from '#models/item'
import { serializeItem } from '#controllers/items_controller'

export default class InventoryController {
  async index({ inertia }: HttpContext) {
    const items = await Item.query()
      .where('status', 'in_stock')
      .preload('product')
      /** Soonest expiry first: the list opens on what has to be eaten today. */
      .orderBy('expires_at', 'asc')
      .orderBy('id', 'asc')

    return inertia.render('inventory', {
      items: items.map(serializeItem),
      /** The client needs this to register for push; absent means no notifications. */
      vapidPublicKey: env.get('VAPID_PUBLIC_KEY') ?? null,
    })
  }
}

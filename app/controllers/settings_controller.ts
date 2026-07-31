import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

export default class SettingsController {
  async index({ inertia }: HttpContext) {
    const subscriptionRow = await db.from('push_subscriptions').count('* as total').first()

    return inertia.render('settings', {
      security: {
        authDisabled: env.get('AUTH_DISABLED', false),
      },
      notifications: {
        configured: Boolean(env.get('VAPID_PUBLIC_KEY') && env.get('VAPID_PRIVATE_KEY')),
        subscriptions: Number(subscriptionRow?.total ?? 0),
      },
    })
  }

  async export({ response }: HttpContext) {
    const [products, items, shoppingItems] = await Promise.all([
      db.from('products').select('*').orderBy('barcode'),
      db.from('items').select('*').orderBy('id'),
      db.from('shopping_items').select('*').orderBy('id'),
    ])

    const exportedAt = DateTime.now().toUTC()
    const backup = {
      format: 'myfrigo-backup',
      version: 1,
      exportedAt: exportedAt.toISO(),
      data: { products, items, shoppingItems },
    }

    response.header(
      'Content-Disposition',
      `attachment; filename="myfrigo-${exportedAt.toFormat('yyyy-LL-dd-HHmm')}.json"`
    )
    response.header('Content-Type', 'application/json; charset=utf-8')
    return response.send(JSON.stringify(backup, null, 2))
  }
}

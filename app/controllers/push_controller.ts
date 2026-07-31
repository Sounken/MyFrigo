import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PushSubscription from '#models/push_subscription'

const subscribeValidator = vine.compile(
  vine.object({
    endpoint: vine.string().url(),
    keys: vine.object({
      p256dh: vine.string(),
      auth: vine.string(),
    }),
  })
)

export default class PushController {
  async subscribe({ request, response }: HttpContext) {
    const payload = await request.validateUsing(subscribeValidator)

    /** Re-subscribing is normal: the browser rotates endpoints on its own. */
    await PushSubscription.updateOrCreate(
      { endpoint: payload.endpoint },
      {
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: request.header('user-agent')?.slice(0, 250) ?? null,
      }
    )

    return response.status(201).send({ status: 'subscribed' })
  }

  async unsubscribe({ request, response }: HttpContext) {
    const endpoint = request.input('endpoint')
    if (endpoint) {
      await PushSubscription.query().where('endpoint', endpoint).delete()
    }
    return response.status(204).send('')
  }
}

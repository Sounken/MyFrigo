import webpush from 'web-push'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Item from '#models/item'
import PushSubscription from '#models/push_subscription'

/** Warn three days out: enough time to actually plan a meal around it. */
export const WARNING_DAYS = 3

let configured: boolean | null = null

function ensureConfigured(): boolean {
  if (configured !== null) return configured

  const publicKey = env.get('VAPID_PUBLIC_KEY')
  const privateKey = env.get('VAPID_PRIVATE_KEY')

  if (!publicKey || !privateKey) {
    configured = false
    return false
  }

  webpush.setVapidDetails(
    env.get('VAPID_SUBJECT') ?? 'mailto:deuleydamien@gmail.com',
    publicKey,
    privateKey
  )
  configured = true
  return true
}

function buildMessage(items: Item[]) {
  const expired = items.filter((item) => item.daysLeft < 0)
  const urgent = items.filter((item) => item.daysLeft >= 0)

  const title = expired.length
    ? `${expired.length} produit${expired.length > 1 ? 's' : ''} périmé${expired.length > 1 ? 's' : ''}`
    : `${urgent.length} produit${urgent.length > 1 ? 's' : ''} à consommer`

  const body = items
    .slice(0, 4)
    .map((item) => {
      const days = item.daysLeft
      if (days < 0) return `${item.product.name} (périmé)`
      if (days === 0) return `${item.product.name} (aujourd’hui)`
      if (days === 1) return `${item.product.name} (demain)`
      return `${item.product.name} (${days} j)`
    })
    .join(', ')

  const more = items.length > 4 ? ` et ${items.length - 4} autre(s)` : ''

  return { title, body: `${body}${more}` }
}

/**
 * Sends one digest to every registered device. On iOS a device only appears
 * here once the app has been added to the home screen — Safari refuses push
 * from a regular tab, so a plain bookmark will never notify.
 */
export async function sendExpiryDigest(): Promise<{ sent: number; items: number }> {
  if (!ensureConfigured()) {
    logger.info('Push disabled: VAPID keys are not set')
    return { sent: 0, items: 0 }
  }

  const cutoff = DateTime.now().startOf('day').plus({ days: WARNING_DAYS })

  const items = await Item.query()
    .where('status', 'in_stock')
    .where('expires_at', '<=', cutoff.toISODate()!)
    .preload('product')
    .orderBy('expires_at', 'asc')

  if (items.length === 0) {
    return { sent: 0, items: 0 }
  }

  const subscriptions = await PushSubscription.all()
  const payload = JSON.stringify({ ...buildMessage(items), url: '/' })

  let sent = 0
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription.toWebPush(), payload)
      subscription.lastNotifiedAt = DateTime.now()
      await subscription.save()
      sent++
    } catch (error: any) {
      /**
       * 404/410 mean the browser dropped the subscription — the app was
       * uninstalled or the endpoint rotated. Keeping it would fail forever.
       */
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await subscription.delete()
      } else {
        logger.warn({ err: error, endpoint: subscription.endpoint }, 'Push delivery failed')
      }
    }
  }

  return { sent, items: items.length }
}

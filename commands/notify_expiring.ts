import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Daily expiry digest. Wired as a Coolify scheduled task rather than an
 * in-process scheduler, so it survives restarts and can be triggered by hand.
 */
export default class NotifyExpiring extends BaseCommand {
  static commandName = 'notify:expiring'
  static description = 'Send the push notification for items expiring soon'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { sendExpiryDigest } = await import('#services/push')
    const { sent, items } = await sendExpiryDigest()

    this.logger.info(`${items} item(s) expiring soon, notification sent to ${sent} device(s)`)
  }
}

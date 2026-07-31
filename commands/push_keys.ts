import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Generates the VAPID key pair identifying this server to the push services.
 * Run once; changing the keys invalidates every existing subscription.
 */
export default class PushKeys extends BaseCommand {
  static commandName = 'push:keys'
  static description = 'Generate a VAPID key pair for Web Push'
  static options: CommandOptions = { startApp: false }

  async run() {
    const webpush = await import('web-push')
    const keys = webpush.default.generateVAPIDKeys()

    this.logger.log('')
    this.logger.log(this.colors.dim('Add these to your .env / Coolify environment variables:'))
    this.logger.log('')
    this.logger.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
    this.logger.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
    this.logger.log(`VAPID_SUBJECT=mailto:deuleydamien@gmail.com`)
    this.logger.log('')
  }
}

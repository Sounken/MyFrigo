import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Prints the scrypt hash to paste into APP_PASSWORD_HASH.
 * The plain password never touches the repository or the env file.
 */
export default class PasswordHash extends BaseCommand {
  static commandName = 'password:hash'
  static description = 'Hash a password for the APP_PASSWORD_HASH environment variable'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'The password to hash' })
  declare password: string

  async run() {
    const hash = await this.app.container.make('hash')
    const digest = await hash.make(this.password)

    /**
     * A scrypt digest is full of `$`, which dotenv treats as the start of a
     * variable reference and silently swallows — a mangled hash then fails
     * every login with no clue as to why. Env files need them escaped;
     * a real environment variable (Coolify's UI) must not be.
     */
    this.logger.log('')
    this.logger.log(this.colors.dim('In a .env file (dollars escaped):'))
    this.logger.log(`APP_PASSWORD_HASH=${digest.replaceAll('$', '\\$')}`)
    this.logger.log('')
    this.logger.log(
      this.colors.dim('In the Coolify environment variables UI (verbatim + enable "Literal"):')
    )
    this.logger.log(`APP_PASSWORD_HASH=${digest}`)
    this.logger.log('')
  }
}

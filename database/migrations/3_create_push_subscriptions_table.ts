import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Web Push endpoints. One row per installed PWA — on iOS that means one row
 * per home-screen install, since Safari refuses push from a plain tab.
 */
export default class extends BaseSchema {
  protected tableName = 'push_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('endpoint').notNullable().unique()
      table.string('p256dh').notNullable()
      table.string('auth').notNullable()
      table.string('user_agent').nullable()

      table.timestamp('last_notified_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

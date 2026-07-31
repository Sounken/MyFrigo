import { BaseSchema } from '@adonisjs/lucid/schema'

/** Allows one safe refresh of composition cached by an older scoring rule. */
export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('composition_version').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('composition_version')
    })
  }
}

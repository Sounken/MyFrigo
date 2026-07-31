import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'shopping_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 120).notNullable()
      table.string('barcode', 32).nullable()
      table.boolean('checked').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['checked', 'created_at'], 'shopping_items_checked_created_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

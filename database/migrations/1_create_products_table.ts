import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Local cache of Open Food Facts, plus the products we named by hand.
 * Keyed by barcode because that is the only stable identifier we have:
 * one product = one code, in every shop and every country.
 */
export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('barcode').primary()

      table.string('name').notNullable()
      table.string('brands').nullable()
      /** Net weight/volume as printed, e.g. "500 g" */
      table.string('quantity_label').nullable()
      table.string('image_url').nullable()
      table.string('nutriscore', 1).nullable()
      /** JSON array of OFF category tags, most generic first */
      table.text('categories_tags').nullable()

      /**
       * off     — enriched from Open Food Facts
       * manual  — not in OFF (store brand), named by hand
       * weighed — in-store label, barcode prefix 2, meaningless elsewhere
       */
      table.string('source').notNullable().defaultTo('manual')

      /** Last successful OFF lookup. Null for manual/weighed products. */
      table.timestamp('fetched_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

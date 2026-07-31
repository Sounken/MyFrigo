import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One row = one physical item on a shelf. Three yoghurts scanned at the
 * checkout are three rows, each with its own expiry date.
 *
 * Rows are never deleted: consuming or binning an item flips `status`.
 * That is what makes the swipe undoable, feeds the waste stats, and — most
 * importantly — keeps `remaining_days` around as the history the expiry
 * estimator learns from.
 */
export default class extends BaseSchema {
  protected tableName = 'items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('barcode').notNullable().references('barcode').inTable('products')

      table.date('expires_at').notNullable()

      /**
       * Days between the scan and the printed expiry date. This is the
       * observation we learn from: the same product bought twice rarely has
       * the same shelf life left, so we keep every measurement rather than a
       * single average per product.
       */
      table.integer('remaining_days').notNullable()

      table.string('location').notNullable().defaultTo('fridge')

      /** in_stock | consumed | trashed */
      table.string('status').notNullable().defaultTo('in_stock')
      table.timestamp('resolved_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      /** The inventory view: everything in stock, soonest expiry first. */
      table.index(['status', 'expires_at'], 'items_status_expires_index')
      /** The estimator: every past observation for one product. */
      table.index(['barcode', 'created_at'], 'items_barcode_created_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

/** Cached Open Food Facts composition used by the product sheet. */
export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('ingredients_text').nullable()
      table.text('allergens_tags').nullable()
      table.text('additives_tags').nullable()
      table.text('labels_tags').nullable()
      table.integer('nova_group').nullable()
      table.text('nutrient_levels').nullable()
      table.text('nutriments').nullable()
      table.text('quality_attributes').nullable()
      table.timestamp('composition_fetched_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns(
        'ingredients_text',
        'allergens_tags',
        'additives_tags',
        'labels_tags',
        'nova_group',
        'nutrient_levels',
        'nutriments',
        'quality_attributes',
        'composition_fetched_at'
      )
    })
  }
}

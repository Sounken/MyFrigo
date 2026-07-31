import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Item from '#models/item'

export type ProductSource = 'off' | 'manual' | 'weighed'

export default class Product extends BaseModel {
  static primaryKey = 'barcode'
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare barcode: string

  @column()
  declare name: string

  @column()
  declare brands: string | null

  @column()
  declare quantityLabel: string | null

  @column()
  declare imageUrl: string | null

  @column()
  declare nutriscore: string | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as string[]) : []),
  })
  declare categoriesTags: string[]

  @column()
  declare source: ProductSource

  @column.dateTime()
  declare fetchedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Item, { foreignKey: 'barcode', localKey: 'barcode' })
  declare items: HasMany<typeof Item>

  get label() {
    return this.brands ? `${this.name} — ${this.brands}` : this.name
  }
}

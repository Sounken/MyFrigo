import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'

export type ItemStatus = 'in_stock' | 'consumed' | 'trashed'
export type ItemLocation = 'fridge' | 'freezer' | 'pantry'

export default class Item extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare barcode: string

  @column.date()
  declare expiresAt: DateTime

  @column()
  declare remainingDays: number

  @column()
  declare location: ItemLocation

  @column()
  declare status: ItemStatus

  @column.dateTime()
  declare resolvedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Product, { foreignKey: 'barcode', localKey: 'barcode' })
  declare product: BelongsTo<typeof Product>

  /**
   * Whole days from today to the expiry date. Negative once expired.
   * Computed on calendar days, not on elapsed hours: an item expiring
   * tomorrow morning should read "1 day", not "0".
   */
  get daysLeft(): number {
    const today = DateTime.now().startOf('day')
    return Math.round(this.expiresAt.startOf('day').diff(today, 'days').days)
  }
}

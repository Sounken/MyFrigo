import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Item from '#models/item'

export type ProductSource = 'off' | 'manual' | 'weighed'

export type ProductNutriments = {
  energyKcal: number | null
  fat: number | null
  saturatedFat: number | null
  carbohydrates: number | null
  sugars: number | null
  fiber: number | null
  proteins: number | null
  salt: number | null
}

export type ProductNutrientLevels = Partial<
  Record<'fat' | 'saturatedFat' | 'sugars' | 'salt', 'low' | 'moderate' | 'high'>
>

export type ProductQualityAttribute = {
  status: 'known' | 'unknown' | 'not-applicable'
  score: number | null
  title: string | null
  description: string | null
}

export type ProductQualityAttributes = {
  nutrition: ProductQualityAttribute | null
  nova: ProductQualityAttribute | null
  additives: ProductQualityAttribute | null
}

const prepareJson = (value: unknown) => (value === null ? null : JSON.stringify(value))
const consumeJson = <T>(value: string | null): T | null => (value ? (JSON.parse(value) as T) : null)

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
  declare ingredientsText: string | null

  @column({
    prepare: prepareJson,
    consume: (value: string | null) => consumeJson<string[]>(value) ?? [],
  })
  declare allergensTags: string[]

  @column({
    prepare: prepareJson,
    consume: (value: string | null) => consumeJson<string[]>(value) ?? [],
  })
  declare additivesTags: string[]

  @column({
    prepare: prepareJson,
    consume: (value: string | null) => consumeJson<string[]>(value) ?? [],
  })
  declare labelsTags: string[]

  @column()
  declare novaGroup: number | null

  @column({ prepare: prepareJson, consume: consumeJson<ProductNutrientLevels> })
  declare nutrientLevels: ProductNutrientLevels | null

  @column({ prepare: prepareJson, consume: consumeJson<ProductNutriments> })
  declare nutriments: ProductNutriments | null

  @column({ prepare: prepareJson, consume: consumeJson<ProductQualityAttributes> })
  declare qualityAttributes: ProductQualityAttributes | null

  @column()
  declare source: ProductSource

  @column.dateTime()
  declare fetchedAt: DateTime | null

  @column.dateTime()
  declare compositionFetchedAt: DateTime | null

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

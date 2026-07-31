import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ShoppingItem from '#models/shopping_item'
import { createShoppingItemValidator, updateShoppingItemValidator } from '#validators/shopping'

function serialize(item: ShoppingItem) {
  return {
    id: item.id,
    name: item.name,
    barcode: item.barcode,
    checked: item.checked,
    createdAt: item.createdAt.toISO()!,
  }
}

export default class ShoppingController {
  async index({ inertia }: HttpContext) {
    const items = await ShoppingItem.query().orderBy('checked', 'asc').orderBy('created_at', 'desc')
    const suggestions = await this.suggestions(items)

    return inertia.render('shopping', {
      items: items.map(serialize),
      suggestions,
    })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createShoppingItemValidator)
    const duplicate = await ShoppingItem.query()
      .whereRaw('lower(name) = lower(?)', [payload.name])
      .first()

    if (duplicate) {
      if (duplicate.checked) {
        duplicate.checked = false
        await duplicate.save()
      }
      return response.send({ item: serialize(duplicate), duplicate: true })
    }

    const item = await ShoppingItem.create({
      name: payload.name,
      barcode: payload.barcode ?? null,
      checked: false,
    })
    return response.status(201).send({ item: serialize(item), duplicate: false })
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateShoppingItemValidator)
    const item = await ShoppingItem.findOrFail(params.id)
    item.checked = payload.checked
    await item.save()
    return response.send({ item: serialize(item) })
  }

  async destroy({ params, response }: HttpContext) {
    const item = await ShoppingItem.findOrFail(params.id)
    await item.delete()
    return response.status(204).send('')
  }

  async clearChecked({ response }: HttpContext) {
    await ShoppingItem.query().where('checked', true).delete()
    return response.status(204).send('')
  }

  /** Recently finished products absent from both the fridge and the list. */
  private async suggestions(shoppingItems: ShoppingItem[]) {
    const inStockRows = await db.from('items').where('status', 'in_stock').distinct('barcode')
    const inStockBarcodes = inStockRows.map((row) => row.barcode)

    const query = db
      .from('items')
      .join('products', 'products.barcode', 'items.barcode')
      .whereIn('items.status', ['consumed', 'trashed'])
      .select('items.barcode', 'products.name')
      .max('items.resolved_at as lastResolvedAt')
      .count('items.id as timesUsed')
      .groupBy('items.barcode', 'products.name')
      .orderBy('lastResolvedAt', 'desc')
      .limit(12)

    if (inStockBarcodes.length > 0) query.whereNotIn('items.barcode', inStockBarcodes)

    const existingNames = new Set(shoppingItems.map((item) => item.name.toLocaleLowerCase('fr')))
    const rows = await query

    return rows
      .filter((row) => !existingNames.has(String(row.name).toLocaleLowerCase('fr')))
      .slice(0, 6)
      .map((row) => ({
        barcode: String(row.barcode),
        name: String(row.name),
        timesUsed: Number(row.timesUsed),
      }))
  }
}

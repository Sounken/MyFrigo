import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Item, { type ItemLocation } from '#models/item'
import Product from '#models/product'
import { createItemValidator, updateItemValidator } from '#validators/item'
import { getWasteStats } from '#services/waste_stats'

export function serializeItem(item: Item) {
  return {
    id: item.id,
    barcode: item.barcode,
    name: item.product.name,
    brands: item.product.brands,
    quantityLabel: item.product.quantityLabel,
    imageUrl: item.product.imageUrl,
    expiresAt: item.expiresAt.toISODate(),
    daysLeft: item.daysLeft,
    location: item.location,
    status: item.status,
  }
}

export default class ItemsController {
  /**
   * Puts one or more identical items in the fridge, creating the product
   * first when we have never seen the barcode.
   */
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createItemValidator)
    const location = (payload.location ?? 'fridge') as ItemLocation
    const quantity = payload.quantity ?? 1

    const expiresAt = DateTime.fromJSDate(payload.expiresAt).startOf('day')
    if (!expiresAt.isValid) {
      return response.status(422).send({ message: 'Date invalide' })
    }

    let product = await Product.find(payload.barcode)

    if (!product) {
      if (!payload.name) {
        return response.status(422).send({ message: 'Nom du produit requis' })
      }
      product = await Product.create({
        barcode: payload.barcode,
        name: payload.name,
        brands: payload.brands || null,
        categoriesTags: [],
        source: payload.weighed ? 'weighed' : 'manual',
      })
    } else if (payload.name && payload.name !== product.name) {
      /** Renaming a store-brand product we had guessed wrong. */
      product.name = payload.name
      if (payload.brands) product.brands = payload.brands
      await product.save()
    }

    /**
     * The observation the estimator learns from. Measured against today
     * rather than the row's timestamp so a backdated entry cannot poison the
     * history with a negative shelf life.
     */
    const remainingDays = Math.max(
      0,
      Math.round(expiresAt.diff(DateTime.now().startOf('day'), 'days').days)
    )

    const rows = Array.from({ length: quantity }, () => ({
      barcode: product!.barcode,
      expiresAt,
      remainingDays,
      location,
      status: 'in_stock' as const,
    }))

    const items = await Item.createMany(rows)
    /** Attach the product we already have rather than re-querying per row. */
    for (const item of items) {
      item.$setRelated('product', product)
    }

    return response.status(201).send({
      items: items.map(serializeItem),
      product: { barcode: product.barcode, name: product.name, brands: product.brands },
    })
  }

  async update({ params, request, response }: HttpContext) {
    const item = await Item.query().where('id', params.id).preload('product').firstOrFail()
    const payload = await request.validateUsing(updateItemValidator)

    if (payload.expiresAt) {
      const expiresAt = DateTime.fromJSDate(payload.expiresAt).startOf('day')
      item.expiresAt = expiresAt
      /** Keep the learned observation consistent with the corrected date. */
      item.remainingDays = Math.max(
        0,
        Math.round(expiresAt.diff(item.createdAt.startOf('day'), 'days').days)
      )
    }
    if (payload.location) {
      item.location = payload.location as ItemLocation
    }

    await item.save()
    return response.send({ item: serializeItem(item) })
  }

  /** Swipe left: eaten. Swipe right: binned. Same one gesture, one call. */
  async resolve({ params, request, response }: HttpContext) {
    const status = request.param('status') === 'trashed' ? 'trashed' : 'consumed'
    const item = await Item.query().where('id', params.id).preload('product').firstOrFail()

    item.status = status
    item.resolvedAt = DateTime.now()
    await item.save()

    return response.send({ item: serializeItem(item) })
  }

  /**
   * Undo. A mis-swipe on a phone is common enough that the fridge would drift
   * out of sync without this, which is the one failure this app cannot afford.
   */
  async restore({ params, response }: HttpContext) {
    const item = await Item.query().where('id', params.id).preload('product').firstOrFail()

    item.status = 'in_stock'
    item.resolvedAt = null
    await item.save()

    return response.send({ item: serializeItem(item) })
  }

  /** Permanent removal, for rows created by mistake that must not be learned from. */
  async destroy({ params, response }: HttpContext) {
    const item = await Item.findOrFail(params.id)
    await item.delete()
    return response.status(204).send('')
  }

  /** Waste stats, cheap enough to compute on the fly at this scale. */
  async stats({ response }: HttpContext) {
    return response.send({ stats: await getWasteStats() })
  }
}

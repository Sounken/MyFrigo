import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Product from '#models/product'
import type { ItemLocation } from '#models/item'
import { parseScan } from '#services/barcode'
import { lookup } from '#services/open_food_facts'
import { estimate } from '#services/expiry_estimator'
import { scanValidator } from '#validators/item'

function serializeProduct(product: Product) {
  return {
    barcode: product.barcode,
    name: product.name,
    brands: product.brands,
    quantityLabel: product.quantityLabel,
    imageUrl: product.imageUrl,
    nutriscore: product.nutriscore,
    source: product.source,
  }
}

export default class ScanController {
  show({ inertia }: HttpContext) {
    return inertia.render('scan')
  }

  /**
   * Resolves one scanned code into everything the confirmation dialog needs:
   * the product, and the expiry dates worth offering. Decoding is paused on
   * the client while this runs, so it has to answer in one round trip.
   */
  async resolve({ request, response }: HttpContext) {
    const { barcode: raw, location = 'fridge' } = await request.validateUsing(scanValidator)
    const parsed = parseScan(raw)

    if (parsed.kind === 'unknown') {
      return response.status(422).send({ status: 'invalid', message: 'Code non reconnu' })
    }

    /**
     * A wrong check digit means a misread, not an unknown product. Say so and
     * let the camera try again rather than opening a dialog for a phantom.
     */
    if (!parsed.validChecksum) {
      return response.status(422).send({ status: 'invalid', message: 'Lecture incorrecte' })
    }

    /**
     * Prefix 2 is an in-store label: the code encodes a weight or a price and
     * means nothing outside that shop. Asking Open Food Facts would be a
     * wasted call, so go straight to naming it — offering the things already
     * named this way, since that is almost always a repeat purchase.
     */
    if (parsed.kind === 'in_store') {
      const known = await Product.query()
        .where('source', 'weighed')
        .orderBy('updated_at', 'desc')
        .limit(8)

      return response.send({
        status: 'weighed',
        barcode: parsed.code,
        suggestions: known.map(serializeProduct),
      })
    }

    const result = await lookup(parsed.code)

    if (result.outcome === 'found') {
      return response.send({
        status: 'found',
        barcode: parsed.code,
        product: serializeProduct(result.product),
        estimate: await estimate(result.product, location as ItemLocation),
        fromCache: result.fromCache,
      })
    }

    /**
     * Store brands are routinely missing from Open Food Facts, and so is
     * anything behind a network hiccup. Both land on manual naming — the
     * difference is only what we tell the user.
     */
    return response.send({
      status: 'unknown',
      barcode: parsed.code,
      reason: result.outcome === 'error' ? result.message : 'Produit absent d’Open Food Facts',
      /** Sensible default so the dialog is still one tap away from done. */
      estimate: {
        defaultDays: 7,
        source: 'fallback' as const,
        observations: 0,
        min: null,
        max: null,
        suggestions: [{ days: 7, primary: true, hint: null }],
        categoryTag: null,
      },
      today: DateTime.now().toISODate(),
    })
  }
}

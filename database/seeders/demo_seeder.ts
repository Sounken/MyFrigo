import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Item from '#models/item'
import Product from '#models/product'

/**
 * A fridge with something in every urgency bucket, so the inventory view can
 * be judged on a realistic day rather than on an empty list.
 *
 * Products are seeded as `manual` — the shape the app produces when a barcode
 * is missing from Open Food Facts — rather than inventing OFF records.
 */
export default class extends BaseSeeder {
  /** Never let a demo fridge appear in production. */
  static environment = ['development', 'testing']

  async run() {
    await db.from('items').delete()
    await db.from('products').whereIn('source', ['manual', 'weighed']).delete()

    const catalogue = [
      { barcode: '3560071492748', name: 'Yaourt nature x8', brands: 'Carrefour', qty: '1 kg' },
      { barcode: '3270190123456', name: 'Filet de poulet', brands: 'U', qty: '400 g' },
      { barcode: '3245412345670', name: 'Salade mêlée', brands: 'Marque Repère', qty: '150 g' },
      { barcode: '3033490004552', name: 'Lait demi-écrémé', brands: 'Lactel', qty: '1 L' },
      { barcode: '3502110009234', name: 'Comté 18 mois', brands: null, qty: '250 g' },
      { barcode: '3161320120010', name: 'Œufs plein air x6', brands: 'Matines', qty: '6' },
      { barcode: '3250390812345', name: 'Jambon blanc', brands: 'Fleury Michon', qty: '4 tr.' },
      { barcode: '8000500310427', name: 'Sauce tomate basilic', brands: 'Barilla', qty: '400 g' },
      { barcode: '3038350201256', name: 'Épinards surgelés', brands: 'Picard', qty: '750 g' },
    ] as const

    for (const entry of catalogue) {
      await Product.updateOrCreate(
        { barcode: entry.barcode },
        {
          barcode: entry.barcode,
          name: entry.name,
          brands: entry.brands,
          quantityLabel: entry.qty,
          categoriesTags: [],
          source: 'manual',
        }
      )
    }

    /** [barcode, days until expiry, where it lives] */
    const stock: [string, number, 'fridge' | 'freezer' | 'pantry'][] = [
      ['3245412345670', -2, 'fridge'], // expired: the salad you forgot
      ['3270190123456', 0, 'fridge'], // today
      ['3033490004552', 1, 'fridge'], // tomorrow
      ['3250390812345', 3, 'fridge'],
      ['3560071492748', 4, 'fridge'],
      ['3560071492748', 4, 'fridge'],
      ['3161320120010', 12, 'fridge'],
      ['3502110009234', 26, 'fridge'],
      ['8000500310427', 320, 'pantry'],
      ['3038350201256', 240, 'freezer'],
    ]

    const today = DateTime.now().startOf('day')

    for (const [barcode, days, location] of stock) {
      await Item.create({
        barcode,
        expiresAt: today.plus({ days }),
        remainingDays: Math.max(0, days),
        location,
        status: 'in_stock',
      })
    }

    /**
     * Past purchases of the yoghurts, consumed long ago. They are what the
     * estimator reads back: three different shelf lives for the same product,
     * which is exactly the case a fixed duration per product cannot handle.
     */
    for (const [days, ago] of [
      [21, 40],
      [12, 26],
      [16, 12],
    ]) {
      await Item.create({
        barcode: '3560071492748',
        expiresAt: today.minus({ days: ago }).plus({ days }),
        remainingDays: days,
        location: 'fridge',
        status: 'consumed',
        resolvedAt: today.minus({ days: ago - 5 }),
      })
    }
  }
}

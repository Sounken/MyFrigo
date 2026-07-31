import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

type ResolutionCounts = {
  consumed: number
  trashed: number
  total: number
  wasteRate: number
}

export type WasteStats = {
  allTime: ResolutionCounts
  last30Days: ResolutionCounts
  inventory: {
    total: number
    urgent: number
    expired: number
  }
  topWasted: { name: string; count: number }[]
}

/** Build a stable shape from SQLite aggregate rows, including an empty fridge. */
async function resolutionCounts(since?: DateTime): Promise<ResolutionCounts> {
  const query = db
    .from('items')
    .select('status')
    .count('* as total')
    .whereIn('status', ['consumed', 'trashed'])
    .groupBy('status')

  if (since) query.where('resolved_at', '>=', since.toSQL()!)

  const rows = await query
  const consumed = Number(rows.find((row) => row.status === 'consumed')?.total ?? 0)
  const trashed = Number(rows.find((row) => row.status === 'trashed')?.total ?? 0)
  const total = consumed + trashed

  return {
    consumed,
    trashed,
    total,
    wasteRate: total === 0 ? 0 : Math.round((trashed / total) * 100),
  }
}

export async function getWasteStats(): Promise<WasteStats> {
  const today = DateTime.now().startOf('day')
  const urgentLimit = today.plus({ days: 3 }).toISODate()!

  const allTime = await resolutionCounts()
  const last30Days = await resolutionCounts(today.minus({ days: 30 }))

  const totalRow = await db.from('items').where('status', 'in_stock').count('* as total').first()
  const urgentRow = await db
    .from('items')
    .where('status', 'in_stock')
    .where('expires_at', '>=', today.toISODate()!)
    .where('expires_at', '<=', urgentLimit)
    .count('* as total')
    .first()
  const expiredRow = await db
    .from('items')
    .where('status', 'in_stock')
    .where('expires_at', '<', today.toISODate()!)
    .count('* as total')
    .first()

  const topWastedRows = await db
    .from('items')
    .join('products', 'products.barcode', 'items.barcode')
    .where('items.status', 'trashed')
    .select('products.name')
    .count('items.id as total')
    .groupBy('products.name')
    .orderBy('total', 'desc')
    .limit(5)

  return {
    allTime,
    last30Days,
    inventory: {
      total: Number(totalRow?.total ?? 0),
      urgent: Number(urgentRow?.total ?? 0),
      expired: Number(expiredRow?.total ?? 0),
    },
    topWasted: topWastedRows.map((row) => ({ name: row.name, count: Number(row.total) })),
  }
}

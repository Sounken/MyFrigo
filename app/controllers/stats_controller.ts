import type { HttpContext } from '@adonisjs/core/http'
import { getWasteStats } from '#services/waste_stats'

export default class StatsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('stats', { stats: await getWasteStats() })
  }
}

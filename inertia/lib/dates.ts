/**
 * Dates are handled as plain YYYY-MM-DD strings throughout the client.
 * An expiry date is a calendar day, not an instant: turning it into a Date
 * would drag a timezone into it and shift the day across a UTC boundary.
 */

export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function isoPlusDays(days: number): string {
  const now = new Date()
  now.setDate(now.getDate() + days)
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function daysUntil(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

const formatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return formatter.format(new Date(year, month - 1, day))
}

export type Urgency = 'expired' | 'today' | 'soon' | 'later'

export function urgencyOf(daysLeft: number): Urgency {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 1) return 'today'
  if (daysLeft <= 4) return 'soon'
  return 'later'
}

/** Reads as a deadline, not as a date: "demain" beats "6 août" in a hurry. */
export function relativeLabel(daysLeft: number): string {
  if (daysLeft < -1) return `périmé depuis ${Math.abs(daysLeft)} j`
  if (daysLeft === -1) return 'périmé hier'
  if (daysLeft === 0) return "aujourd'hui"
  if (daysLeft === 1) return 'demain'
  if (daysLeft < 7) return `dans ${daysLeft} j`
  if (daysLeft < 14) return 'dans 1 semaine'
  if (daysLeft < 31) return `dans ${Math.round(daysLeft / 7)} semaines`
  if (daysLeft < 365) return `dans ${Math.round(daysLeft / 30)} mois`
  return `dans ${Math.round(daysLeft / 365)} an(s)`
}

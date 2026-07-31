/**
 * Brute-force guard for the one password that opens the app.
 *
 * In-memory on purpose: a single process owns the app, and losing the counters
 * on redeploy is harmless compared to pulling in a whole rate-limiter package
 * and a store to back it.
 */
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

type Attempts = { count: number; firstAt: number }

const attempts = new Map<string, Attempts>()

export function isLocked(key: string): number {
  const record = attempts.get(key)
  if (!record) return 0

  const elapsed = Date.now() - record.firstAt
  if (elapsed > WINDOW_MS) {
    attempts.delete(key)
    return 0
  }

  if (record.count < MAX_ATTEMPTS) return 0

  /** Seconds left before the window rolls over. */
  return Math.ceil((WINDOW_MS - elapsed) / 1000)
}

export function recordFailure(key: string): void {
  const record = attempts.get(key)
  if (!record || Date.now() - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() })
    return
  }
  record.count += 1
}

export function clearFailures(key: string): void {
  attempts.delete(key)
}

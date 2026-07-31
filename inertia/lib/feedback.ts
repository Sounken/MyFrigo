/**
 * Scan feedback.
 *
 * iOS Safari does not implement the Vibration API, so the confirmation a
 * barcode was read has to be audible. The AudioContext is created on the tap
 * that starts the camera — Safari refuses to start one without a user gesture.
 */

let context: AudioContext | null = null

export function unlockAudio(): void {
  if (context) return
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctor) return

  context = new Ctor()
  /** Safari starts the context suspended even inside a gesture handler. */
  void context.resume()
}

function tone(frequency: number, durationMs: number, volume = 0.08): void {
  if (!context) return

  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.value = volume

  oscillator.connect(gain)
  gain.connect(context.destination)

  const now = context.currentTime
  /** Ramp the tail down, otherwise the abrupt stop clicks. */
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)

  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000)
}

export function beepDetected(): void {
  tone(1180, 90)
  navigator.vibrate?.(30)
}

export function beepAdded(): void {
  tone(880, 70)
  window.setTimeout(() => tone(1320, 90), 80)
  navigator.vibrate?.([20, 40, 30])
}

export function beepRejected(): void {
  tone(220, 160, 0.06)
  navigator.vibrate?.(120)
}

import { useEffect, useState } from 'react'
import { post } from '~/lib/api'

/**
 * Expiry notifications, and the one iOS caveat that decides whether they work
 * at all: Safari only delivers Web Push to a page installed on the home
 * screen. From a normal tab the subscription can never be created, so we
 * explain the install instead of showing a button that would silently fail.
 */

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/** VAPID keys travel base64url; PushManager wants raw bytes. */
function decodeKey(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

type State = 'checking' | 'unsupported' | 'needs_install' | 'can_enable' | 'enabled' | 'denied'

export default function PushPrompt({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>('checking')
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('myfrigo:push-dismissed') === '1'
  )

  useEffect(() => {
    let cancelled = false

    async function detect() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        /** On iOS the APIs only exist once installed, so distinguish the two. */
        return setState(isIos() && !isStandalone() ? 'needs_install' : 'unsupported')
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      const existing = await registration.pushManager.getSubscription()
      if (cancelled) return

      if (existing) return setState('enabled')
      if (Notification.permission === 'denied') return setState('denied')
      if (isIos() && !isStandalone()) return setState('needs_install')
      setState('can_enable')
    }

    detect().catch(() => setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return setState('denied')

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(vapidPublicKey),
    })

    await post('/api/push/subscribe', subscription.toJSON())
    setState('enabled')
  }

  function dismiss() {
    localStorage.setItem('myfrigo:push-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || state === 'checking' || state === 'enabled' || state === 'unsupported') {
    return null
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      {state === 'needs_install' ? (
        <>
          <p className="text-sm font-medium">Alertes à J-3</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            Sur iPhone, les notifications n’existent qu’une fois l’app installée : Partager → « Sur
            l’écran d’accueil ».
          </p>
        </>
      ) : state === 'denied' ? (
        <p className="text-xs leading-relaxed text-neutral-400">
          Notifications bloquées. Réglages → Notifications → MyFrigo pour les réactiver.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm">Être prévenu 3 jours avant péremption</p>
          <button
            type="button"
            onClick={() => void enable()}
            className="shrink-0 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-neutral-950"
          >
            Activer
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={dismiss}
        className="mt-2 text-[11px] text-neutral-600 underline"
      >
        Ne plus afficher
      </button>
    </div>
  )
}

import { Head, Link } from '@inertiajs/react'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import ExpiryDialog, { type ConfirmPayload } from '~/components/expiry_dialog'
import { post } from '~/lib/api'
import { beepAdded, beepDetected, beepRejected, unlockAudio } from '~/lib/feedback'
import { useBarcodeScanner } from '~/lib/use_barcode_scanner'
import type { InventoryItem, ScanResolution } from '~/lib/types'

type Resolved = Extract<ScanResolution, { status: 'found' | 'unknown' | 'weighed' }>

export default function ScanPage() {
  const [resolution, setResolution] = useState<Resolved | null>(null)
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [added, setAdded] = useState<InventoryItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [showManual, setShowManual] = useState(false)

  const noticeTimer = useRef<number | null>(null)

  const flash = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2200)
  }, [])

  const resolveBarcode = useCallback(
    async (barcode: string) => {
      setResolving(true)
      try {
        const result = await post<ScanResolution>('/api/scan', { barcode })
        if (result.status === 'invalid') {
          beepRejected()
          flash(result.message)
          return false
        }
        setResolution(result as Resolved)
        return true
      } catch {
        beepRejected()
        flash('Impossible de lire ce produit')
        return false
      } finally {
        setResolving(false)
      }
    },
    [flash]
  )

  /** The detection callback needs the controls the hook has not returned yet. */
  const scannerRef = useRef<ReturnType<typeof useBarcodeScanner> | null>(null)

  const scanner = useBarcodeScanner({
    onDetected: (barcode) => {
      /**
       * Pause first, then look up. Every later step — the dialog, the save —
       * happens with decoding stopped, so a barcode still in frame can never
       * queue a second dialog behind the one being answered.
       */
      scannerRef.current?.pause()
      beepDetected()
      void resolveBarcode(barcode).then((ok) => {
        if (!ok) scannerRef.current?.resume()
      })
    },
  })

  scannerRef.current = scanner

  async function handleConfirm(payload: ConfirmPayload) {
    setSaving(true)
    try {
      const response = await post<{ items: InventoryItem[] }>('/api/items', payload)
      beepAdded()
      setAdded((current) => [...response.items, ...current].slice(0, 12))
      setResolution(null)
      scanner.resume()
    } catch {
      flash("L'ajout a échoué")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setResolution(null)
    scanner.resume()
  }

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault()
    const code = manual.trim()
    if (!code) return
    setShowManual(false)
    setManual('')
    scanner.pause()
    const ok = await resolveBarcode(code)
    if (!ok) scanner.resume()
  }

  const live = scanner.state === 'scanning' || scanner.state === 'paused'

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black">
      <Head title="Scanner" />

      <video
        ref={scanner.videoRef}
        className="absolute inset-0 size-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {/* Reticle: marks the band that is actually decoded */}
      {live && (
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="absolute inset-x-0 top-0 h-[29%] bg-black/55" />
          <div className="absolute inset-x-0 bottom-0 h-[29%] bg-black/55" />
          <div className="relative mx-6 h-[42dvh] max-h-[42%] w-full">
            <div
              className={`absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 transition-colors ${
                scanner.state === 'paused' ? 'bg-neutral-500' : 'bg-emerald-400'
              }`}
            />
            <Corner className="left-0 top-0 border-l-2 border-t-2" />
            <Corner className="right-0 top-0 border-r-2 border-t-2" />
            <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
            <Corner className="bottom-0 right-0 border-b-2 border-r-2" />
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="no-tap-select rounded-full bg-black/50 px-4 py-2 text-sm font-medium backdrop-blur"
        >
          ← Frigo
        </Link>
        <div className="flex items-center gap-2">
          {added.length > 0 && (
            <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-neutral-950">
              {added.length} ajouté{added.length > 1 ? 's' : ''}
            </span>
          )}
          {/**
           * Always reachable: a barcode too damaged to read can turn up on the
           * tenth item of a run, not just the first.
           */}
          {live && !resolution && (
            <button
              type="button"
              onClick={() => setShowManual((open) => !open)}
              aria-label="Saisir le code à la main"
              className="no-tap-select rounded-full bg-black/50 px-3 py-2 text-sm backdrop-blur"
            >
              ⌨
            </button>
          )}
        </div>
      </div>

      {/* Idle / error states */}
      {!live && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div>
            <p className="text-2xl font-semibold">Scan en rafale</p>
            <p className="mt-2 text-sm text-neutral-400">
              La caméra reste ouverte entre les articles. Un bip, une date à confirmer, on enchaîne.
            </p>
          </div>

          {scanner.error && (
            <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
              {scanner.error}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              /** Same tap unlocks the camera permission and the audio context. */
              unlockAudio()
              void scanner.start()
            }}
            disabled={scanner.state === 'starting'}
            className="no-tap-select rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-neutral-950 active:bg-emerald-400 disabled:opacity-50"
          >
            {scanner.state === 'starting' ? 'Ouverture…' : 'Ouvrir la caméra'}
          </button>
        </div>
      )}

      {/* Recently added, most recent first */}
      {live && added.length > 0 && !resolution && (
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {added.slice(0, 3).map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl bg-black/70 px-4 py-2.5 backdrop-blur"
              style={{ opacity: 1 - index * 0.28 }}
            >
              <span className="text-emerald-400">✓</span>
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
              <span className="text-xs text-neutral-400">{item.expiresAt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Manual entry, for a barcode too damaged to read */}
      {live && !resolution && showManual && (
        <div className="absolute inset-x-0 top-16 z-30 px-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              autoFocus
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              inputMode="numeric"
              enterKeyHint="search"
              placeholder="Code-barres"
              className="flex-1 rounded-xl border border-neutral-700 bg-black/80 px-3 py-3 outline-none backdrop-blur focus:border-neutral-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950"
            >
              OK
            </button>
          </form>
        </div>
      )}

      {/* Transient messages */}
      {(notice || resolving) && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex justify-center">
          <span className="rounded-full bg-black/80 px-4 py-2 text-sm backdrop-blur">
            {notice ?? 'Recherche…'}
          </span>
        </div>
      )}

      {resolution && (
        <ExpiryDialog
          resolution={resolution}
          saving={saving}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute size-7 rounded-sm border-emerald-400/80 ${className}`} />
}

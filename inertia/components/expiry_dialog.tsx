import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate, isoPlusDays, todayIso } from '~/lib/dates'
import { LOCATION_LABELS, type ItemLocation, type ScanResolution } from '~/lib/types'

export type ConfirmPayload = {
  barcode: string
  name?: string
  weighed?: boolean
  expiresAt: string
  location: ItemLocation
  quantity: number
}

type Props = {
  resolution: Extract<ScanResolution, { status: 'found' | 'unknown' | 'weighed' }>
  saving: boolean
  onConfirm: (payload: ConfirmPayload) => void
  onCancel: () => void
}

/**
 * The confirmation step of a scan. Decoding is paused for as long as this is
 * open, so it is the only thing on screen that can be interacted with — and
 * the reason it has to close in a single tap in the common case.
 */
export default function ExpiryDialog({ resolution, saving, onConfirm, onCancel }: Props) {
  const estimate = 'estimate' in resolution ? resolution.estimate : null
  const suggestions = estimate?.suggestions ?? [{ days: 7, primary: true, hint: null }]
  const primary = suggestions.find((suggestion) => suggestion.primary) ?? suggestions[0]

  const [expiresAt, setExpiresAt] = useState(() => isoPlusDays(primary.days))
  const [location, setLocation] = useState<ItemLocation>('fridge')
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState(resolution.status === 'found' ? resolution.product.name : '')

  const nameRef = useRef<HTMLInputElement>(null)
  const needsName = resolution.status !== 'found'

  useEffect(() => {
    /**
     * Focus the field only when it is genuinely the next thing to do. Popping
     * the keyboard open on a known product would bury the Add button.
     */
    if (needsName && !name) nameRef.current?.focus()
  }, [needsName, name])

  const productLabel = useMemo(() => {
    if (resolution.status === 'found') {
      const { product } = resolution
      return [product.brands, product.quantityLabel].filter(Boolean).join(' · ')
    }
    return null
  }, [resolution])

  const canSubmit = (!needsName || name.trim().length > 0) && Boolean(expiresAt) && !saving

  function submit() {
    if (!canSubmit) return
    onConfirm({
      barcode: resolution.barcode,
      name: needsName ? name.trim() : undefined,
      weighed: resolution.status === 'weighed',
      expiresAt,
      location,
      quantity,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl border-t border-neutral-800 bg-neutral-900 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        <div className="max-h-[75dvh] space-y-5 overflow-y-auto px-5 pb-2">
          {/* Identity */}
          <div className="flex items-start gap-3">
            {resolution.status === 'found' && resolution.product.imageUrl ? (
              <img
                src={resolution.product.imageUrl}
                alt=""
                className="size-14 shrink-0 rounded-xl bg-neutral-800 object-contain"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-2xl">
                {resolution.status === 'weighed' ? '⚖️' : '📦'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {needsName ? (
                <>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nom du produit"
                    enterKeyHint="done"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 font-medium outline-none focus:border-neutral-500"
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    {resolution.status === 'weighed'
                      ? 'Étiquette magasin : le code ne vaut que pour cette barquette.'
                      : resolution.reason}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium leading-tight">{resolution.product.name}</p>
                  {productLabel && (
                    <p className="mt-0.5 truncate text-sm text-neutral-400">{productLabel}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Previously named weighed products: nearly always a repeat purchase */}
          {resolution.status === 'weighed' && resolution.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {resolution.suggestions.map((product) => (
                <button
                  key={product.barcode}
                  type="button"
                  onClick={() => setName(product.name)}
                  className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm active:bg-neutral-700"
                >
                  {product.name}
                </button>
              ))}
            </div>
          )}

          {/* Expiry */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-neutral-300">Date de péremption</span>
              {estimate && estimate.observations > 0 && (
                <span className="text-xs text-neutral-500">
                  {estimate.observations} achat{estimate.observations > 1 ? 's' : ''} observé
                  {estimate.observations > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => {
                const iso = isoPlusDays(suggestion.days)
                const selected = iso === expiresAt
                return (
                  <button
                    key={suggestion.days}
                    type="button"
                    onClick={() => setExpiresAt(iso)}
                    className={`no-tap-select rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-emerald-400 bg-emerald-400/10'
                        : 'border-neutral-700 bg-neutral-800 active:bg-neutral-700'
                    }`}
                  >
                    <span className="block text-sm font-semibold">+{suggestion.days} j</span>
                    <span className="block text-xs text-neutral-400">{formatDate(iso)}</span>
                    {suggestion.hint && (
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-neutral-500">
                        {suggestion.hint}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <input
              type="date"
              value={expiresAt}
              min={todayIso()}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 outline-none focus:border-neutral-500"
            />

            {estimate?.source === 'category' && estimate.observations === 0 && (
              <p className="mt-2 text-xs text-neutral-500">
                Première fois : estimation par catégorie. Ta correction sera retenue.
              </p>
            )}
          </div>

          {/* Where, and how many */}
          <div className="flex items-center gap-3">
            <div className="flex flex-1 rounded-xl bg-neutral-800 p-1">
              {(Object.keys(LOCATION_LABELS) as ItemLocation[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocation(key)}
                  className={`no-tap-select flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    location === key ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                  }`}
                >
                  {LOCATION_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-xl bg-neutral-800">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="no-tap-select px-3.5 py-2 text-lg leading-none text-neutral-400 active:text-white"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(50, value + 1))}
                className="no-tap-select px-3.5 py-2 text-lg leading-none text-neutral-400 active:text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="no-tap-select rounded-2xl px-5 py-4 text-sm font-medium text-neutral-400 active:bg-neutral-800"
          >
            Ignorer
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="no-tap-select flex-1 rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-neutral-950 transition-opacity active:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? 'Ajout…' : quantity > 1 ? `Ajouter ×${quantity}` : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

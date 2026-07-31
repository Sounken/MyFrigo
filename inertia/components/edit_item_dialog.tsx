import { useState } from 'react'
import { destroy, patch } from '~/lib/api'
import { LOCATION_LABELS, type InventoryItem, type ItemLocation } from '~/lib/types'

type Props = {
  item: InventoryItem
  onClose: () => void
  onSaved: (item: InventoryItem) => void
  onDeleted: (item: InventoryItem) => void
}

export default function EditItemDialog({ item, onClose, onSaved, onDeleted }: Props) {
  const [expiresAt, setExpiresAt] = useState(item.expiresAt)
  const [location, setLocation] = useState<ItemLocation>(item.location)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const response = await patch<{ item: InventoryItem }>(`/api/items/${item.id}`, {
        expiresAt,
        location,
      })
      onSaved(response.item)
    } catch {
      setError("La modification n'a pas pu être enregistrée.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)
    setError(null)
    try {
      await destroy(`/api/items/${item.id}`)
      onDeleted(item)
    } catch {
      setError("L'article n'a pas pu être supprimé.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl border-t border-neutral-800 bg-neutral-900 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        <div className="space-y-5 px-5 pb-2">
          <div className="flex items-center gap-3">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="size-12 shrink-0 rounded-xl bg-neutral-800 object-contain"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-xl">
                📦
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{item.name}</h2>
              <p className="mt-0.5 truncate text-xs text-neutral-500">
                {[item.brands, item.quantityLabel].filter(Boolean).join(' · ') || item.barcode}
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-300">
              Date de péremption
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-3 outline-none focus:border-neutral-500"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-neutral-300">Emplacement</span>
            <div className="flex rounded-xl bg-neutral-800 p-1">
              {(Object.keys(LOCATION_LABELS) as ItemLocation[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocation(key)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-colors ${
                    location === key ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                  }`}
                >
                  {LOCATION_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          {confirmDelete ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-sm text-red-200">Supprimer définitivement cet article ?</p>
              <p className="mt-1 text-xs text-neutral-500">
                À utiliser pour un scan créé par erreur. Cette suppression ne comptera pas comme
                gaspillage.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-neutral-800 py-2.5 text-sm"
                >
                  Garder
                </button>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-400"
            >
              Supprimer ce scan
            </button>
          )}
        </div>

        <div className="mt-5 flex gap-3 px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl px-5 py-3.5 text-sm font-medium text-neutral-400 active:bg-neutral-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !expiresAt}
            className="flex-1 rounded-2xl bg-emerald-500 py-3.5 font-semibold text-neutral-950 disabled:opacity-40"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

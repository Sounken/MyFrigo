import { Head } from '@inertiajs/react'
import { useMemo, useState, type FormEvent } from 'react'
import AppShell, { LogoutButton } from '~/components/app_shell'
import { destroy, patch, post } from '~/lib/api'
import type { ShoppingItem, ShoppingSuggestion } from '~/lib/types'

type Props = {
  items: ShoppingItem[]
  suggestions: ShoppingSuggestion[]
}

export default function ShoppingPage({
  items: initialItems,
  suggestions: initialSuggestions,
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const pending = useMemo(() => items.filter((item) => !item.checked), [items])
  const checked = useMemo(() => items.filter((item) => item.checked), [items])

  async function add(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    await addItem({ name: trimmed })
    setName('')
  }

  async function addItem(input: { name: string; barcode?: string }) {
    setSaving(true)
    setNotice(null)
    try {
      const response = await post<{ item: ShoppingItem; duplicate: boolean }>(
        '/api/shopping',
        input
      )
      setItems((current) => {
        const withoutExisting = current.filter((item) => item.id !== response.item.id)
        return [response.item, ...withoutExisting]
      })
      setSuggestions((current) => current.filter((suggestion) => suggestion.name !== input.name))
      if (response.duplicate) setNotice(`${response.item.name} était déjà dans la liste.`)
    } catch {
      setNotice("L'ajout n'a pas fonctionné.")
    } finally {
      setSaving(false)
    }
  }

  async function toggle(item: ShoppingItem) {
    const checkedValue = !item.checked
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, checked: checkedValue } : candidate
      )
    )
    try {
      const response = await patch<{ item: ShoppingItem }>(`/api/shopping/${item.id}`, {
        checked: checkedValue,
      })
      setItems((current) =>
        current.map((candidate) => (candidate.id === item.id ? response.item : candidate))
      )
    } catch {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, checked: item.checked } : candidate
        )
      )
    }
  }

  async function remove(item: ShoppingItem) {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    try {
      await destroy(`/api/shopping/${item.id}`)
    } catch {
      setItems((current) => [item, ...current])
    }
  }

  async function clearChecked() {
    const previous = items
    setItems((current) => current.filter((item) => !item.checked))
    try {
      await destroy('/api/shopping/checked')
    } catch {
      setItems(previous)
    }
  }

  return (
    <AppShell title="Liste de courses" action={<LogoutButton />}>
      <Head title="Liste de courses" />

      <div className="border-b border-neutral-800/70 px-4 py-4">
        <form onSubmit={add} className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ajouter un produit"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 outline-none focus:border-neutral-600"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded-xl bg-emerald-500 px-4 font-semibold text-neutral-950 disabled:opacity-40"
          >
            Ajouter
          </button>
        </form>
        {notice && <p className="mt-2 text-xs text-neutral-400">{notice}</p>}
      </div>

      {suggestions.length > 0 && (
        <section className="border-b border-neutral-800/70 px-4 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">À racheter peut-être</h2>
            <span className="text-[11px] text-neutral-500">d’après ton historique</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.barcode}
                type="button"
                onClick={() => void addItem(suggestion)}
                disabled={saving}
                className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs active:bg-neutral-800 disabled:opacity-50"
              >
                + {suggestion.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div className="px-8 py-20 text-center">
          <p className="text-5xl">🛒</p>
          <p className="mt-4 text-lg font-semibold">Liste vide</p>
          <p className="mt-1 text-sm text-neutral-500">
            Ajoute ce qu’il manque ou utilise les suggestions de réachat.
          </p>
        </div>
      ) : (
        <div className="pb-6">
          <section>
            <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              À prendre · {pending.length}
            </h2>
            {pending.map((item) => (
              <ShoppingRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
            ))}
          </section>

          {checked.length > 0 && (
            <section className="mt-3">
              <div className="flex items-center justify-between px-4 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Dans le panier · {checked.length}
                </h2>
                <button
                  type="button"
                  onClick={() => void clearChecked()}
                  className="text-xs text-neutral-500 underline"
                >
                  Effacer
                </button>
              </div>
              {checked.map((item) => (
                <ShoppingRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
              ))}
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onRemove: (item: ShoppingItem) => void
}) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-800/70 px-4 py-3">
      <button
        type="button"
        onClick={() => void onToggle(item)}
        aria-label={item.checked ? `Décocher ${item.name}` : `Cocher ${item.name}`}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors ${
          item.checked
            ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
            : 'border-neutral-600 text-transparent'
        }`}
      >
        ✓
      </button>
      <span
        className={`min-w-0 flex-1 truncate ${item.checked ? 'text-neutral-600 line-through' : ''}`}
      >
        {item.name}
      </span>
      <button
        type="button"
        onClick={() => void onRemove(item)}
        aria-label={`Supprimer ${item.name}`}
        className="flex size-8 items-center justify-center rounded-full text-neutral-600 active:bg-neutral-800 active:text-red-400"
      >
        ×
      </button>
    </div>
  )
}

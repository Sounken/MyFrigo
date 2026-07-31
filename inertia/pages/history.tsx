import { Head, Link } from '@inertiajs/react'
import { useMemo, useState, type ReactNode } from 'react'
import AppShell from '~/components/app_shell'
import { post } from '~/lib/api'
import { formatDate } from '~/lib/dates'
import { LOCATION_LABELS, type InventoryItem, type ItemStatus } from '~/lib/types'

type Filter = 'all' | Extract<ItemStatus, 'consumed' | 'trashed'>

export default function HistoryPage({ items: initialItems }: { items: InventoryItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [restoring, setRestoring] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    const needle = normalizeSearch(query)
    return items.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false
      if (!needle) return true
      return normalizeSearch(
        [item.name, item.brands, item.barcode].filter(Boolean).join(' ')
      ).includes(needle)
    })
  }, [filter, items, query])

  const groups = useMemo(() => groupByDay(filteredItems), [filteredItems])

  async function restore(item: InventoryItem) {
    setRestoring(item.id)
    setNotice(null)
    try {
      await post(`/api/items/${item.id}/restore`)
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
      setNotice(`${item.name} est de retour dans le frigo.`)
    } catch {
      setNotice("La restauration n'a pas fonctionné.")
    } finally {
      setRestoring(null)
    }
  }

  return (
    <AppShell
      title="Historique"
      action={
        <Link href="/stats" className="rounded-full px-3 py-1.5 text-xs text-neutral-400">
          Bilan
        </Link>
      }
    >
      <Head title="Historique" />

      <div className="space-y-3 border-b border-neutral-800/70 px-4 py-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher dans l’historique"
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 outline-none focus:border-neutral-600"
        />

        <div className="flex gap-2">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            Tout · {items.length}
          </FilterButton>
          <FilterButton active={filter === 'consumed'} onClick={() => setFilter('consumed')}>
            Mangés · {items.filter((item) => item.status === 'consumed').length}
          </FilterButton>
          <FilterButton active={filter === 'trashed'} onClick={() => setFilter('trashed')}>
            Jetés · {items.filter((item) => item.status === 'trashed').length}
          </FilterButton>
        </div>
      </div>

      {notice && <p className="mx-4 mt-3 rounded-xl bg-neutral-900 px-3 py-2 text-sm">{notice}</p>}

      {groups.length === 0 ? (
        <div className="px-8 py-20 text-center">
          <p className="text-4xl">🕘</p>
          <p className="mt-3 font-medium">Aucune sortie trouvée</p>
          <p className="mt-1 text-sm text-neutral-500">
            Les produits mangés ou jetés apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="pb-6">
          {groups.map((group) => (
            <section key={group.day}>
              <h2 className="sticky top-14 z-10 bg-neutral-950/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 backdrop-blur">
                {dayLabel(group.day)}
              </h2>
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center gap-3 border-b border-neutral-800/70 px-4 py-3"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      item.status === 'consumed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {item.status === 'consumed' ? '✓' : '🗑'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {LOCATION_LABELS[item.location]} · périmait le {formatDate(item.expiresAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void restore(item)}
                    disabled={restoring === item.id}
                    className="shrink-0 rounded-xl bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-300 disabled:opacity-50"
                  >
                    {restoring === item.id ? '…' : 'Restaurer'}
                  </button>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </AppShell>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? 'bg-white text-neutral-950' : 'bg-neutral-900 text-neutral-400'
      }`}
    >
      {children}
    </button>
  )
}

function groupByDay(items: InventoryItem[]) {
  const groups = new Map<string, InventoryItem[]>()
  for (const item of items) {
    const day = item.resolvedAt?.slice(0, 10) ?? 'unknown'
    groups.set(day, [...(groups.get(day) ?? []), item])
  }
  return [...groups].map(([day, groupedItems]) => ({ day, items: groupedItems }))
}

function dayLabel(iso: string) {
  if (iso === 'unknown') return 'Date inconnue'
  const today = new Date()
  const todayIso = localIso(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === todayIso) return "Aujourd'hui"
  if (iso === localIso(yesterday)) return 'Hier'

  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, day))
}

function localIso(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
}

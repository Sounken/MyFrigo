import { Head, Link } from '@inertiajs/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import AppShell, { LogoutButton } from '~/components/app_shell'
import PushPrompt from '~/components/push_prompt'
import SwipeableItem from '~/components/swipeable_item'
import { post } from '~/lib/api'
import { urgencyOf, type Urgency } from '~/lib/dates'
import type { InventoryItem } from '~/lib/types'

type Props = {
  items: InventoryItem[]
  vapidPublicKey: string | null
}

const SECTIONS: { key: Urgency; title: string; tone: string }[] = [
  { key: 'expired', title: 'Périmé', tone: 'text-red-400' },
  { key: 'today', title: 'À manger maintenant', tone: 'text-orange-400' },
  { key: 'soon', title: 'Cette semaine', tone: 'text-amber-300' },
  { key: 'later', title: 'Plus tard', tone: 'text-neutral-500' },
]

/** Long enough to catch a mis-swipe, short enough not to linger over the list. */
const UNDO_MS = 5000

export default function InventoryPage({ items: initialItems, vapidPublicKey }: Props) {
  const [items, setItems] = useState(initialItems)
  const [undo, setUndo] = useState<{ item: InventoryItem; label: string } | null>(null)
  const undoTimer = useRef<number | null>(null)

  const sections = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      items: items.filter((item) => urgencyOf(item.daysLeft) === section.key),
    })).filter((section) => section.items.length > 0)
  }, [items])

  const resolve = useCallback(async (item: InventoryItem, status: 'consumed' | 'trashed') => {
    /**
     * Optimistic on purpose: the row leaves the list on the gesture, not on
     * the round trip. Waiting for the server would make the swipe feel broken
     * on a weak connection, which is exactly when you are in the kitchen.
     */
    setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    setUndo({ item, label: status === 'consumed' ? 'Mangé' : 'Jeté' })

    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)

    try {
      await post(`/api/items/${item.id}/${status}`)
    } catch {
      /** Put it back rather than let the list lie about the fridge. */
      setItems((current) => [...current, item].sort(byExpiry))
      setUndo(null)
    }
  }, [])

  const restore = useCallback(async () => {
    if (!undo) return
    const { item } = undo
    setUndo(null)
    setItems((current) => [...current, item].sort(byExpiry))

    try {
      await post(`/api/items/${item.id}/restore`)
    } catch {
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    }
  }, [undo])

  return (
    <AppShell title="Mon frigo" action={<LogoutButton />}>
      <Head title="Mon frigo" />

      {vapidPublicKey && <PushPrompt vapidPublicKey={vapidPublicKey} />}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-5 px-8 py-20 text-center">
          <span className="text-5xl">🧊</span>
          <div>
            <p className="text-lg font-semibold">Frigo vide</p>
            <p className="mt-1 text-sm text-neutral-500">
              Scanne tes courses en rentrant, la caméra reste ouverte d’un article à l’autre.
            </p>
          </div>
          <Link
            href="/scan"
            className="rounded-2xl bg-emerald-500 px-6 py-3.5 font-semibold text-neutral-950"
          >
            Scanner mes courses
          </Link>
        </div>
      ) : (
        <div className="pb-4">
          {sections.map((section) => (
            <section key={section.key}>
              <h2
                className={`sticky top-14 z-10 bg-neutral-950/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide backdrop-blur ${section.tone}`}
              >
                {section.title}
                <span className="ml-2 font-normal text-neutral-600">{section.items.length}</span>
              </h2>
              {section.items.map((item) => (
                <SwipeableItem
                  key={item.id}
                  item={item}
                  onConsume={() => resolve(item, 'consumed')}
                  onTrash={() => resolve(item, 'trashed')}
                />
              ))}
            </section>
          ))}

          <p className="px-4 py-6 text-center text-xs text-neutral-600">
            Glisse à gauche pour « mangé », à droite pour « jeté ».
          </p>
        </div>
      )}

      {/* Undo */}
      {undo && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-2xl bg-neutral-800 px-4 py-3 shadow-xl">
            <span className="truncate text-sm">
              {undo.label} · {undo.item.name}
            </span>
            <button
              type="button"
              onClick={restore}
              className="shrink-0 text-sm font-semibold text-emerald-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <footer className="px-4 pb-6 text-center text-[10px] leading-relaxed text-neutral-700">
        Données produits issues d’
        <a
          href="https://world.openfoodfacts.org"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts
        </a>
        , sous licence ODbL.
      </footer>
    </AppShell>
  )
}

function byExpiry(a: InventoryItem, b: InventoryItem) {
  return a.expiresAt.localeCompare(b.expiresAt) || a.id - b.id
}

import { Head, Link, router } from '@inertiajs/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion } from 'motion/react'
import AppShell, { LogoutButton } from '~/components/app_shell'
import EditItemDialog from '~/components/edit_item_dialog'
import PushPrompt from '~/components/push_prompt'
import SwipeableItem from '~/components/swipeable_item'
import { api, post } from '~/lib/api'
import { urgencyOf, type Urgency } from '~/lib/dates'
import {
  LOCATION_LABELS,
  type InventoryItem,
  type ItemLocation,
  type ProductDetails,
} from '~/lib/types'

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

const PREVIEW_NUTRISCORE_COLORS: Record<string, string> = {
  a: 'bg-emerald-500 text-neutral-950',
  b: 'bg-lime-400 text-neutral-950',
  c: 'bg-yellow-400 text-neutral-950',
  d: 'bg-orange-500 text-neutral-950',
  e: 'bg-red-500 text-white',
}

export default function InventoryPage({ items: initialItems, vapidPublicKey }: Props) {
  const [items, setItems] = useState(initialItems)
  const [undo, setUndo] = useState<{ item: InventoryItem; label: string } | null>(null)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [previewBarcode, setPreviewBarcode] = useState<string | null>(null)
  const [previewProduct, setPreviewProduct] = useState<ProductDetails | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState<'all' | ItemLocation>('all')
  const undoTimer = useRef<number | null>(null)
  const previewRequest = useRef(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const searchInput = searchInputRef.current
    if (!searchInput) return

    /** iOS can restore focus to the first input when reopening a PWA. */
    searchInput.blur()
    const frame = window.requestAnimationFrame(() => searchInput.blur())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const filteredItems = useMemo(() => {
    const needle = normalizeSearch(query)
    return items.filter((item) => {
      if (location !== 'all' && item.location !== location) return false
      if (!needle) return true
      return normalizeSearch(
        [item.name, item.brands, item.barcode].filter(Boolean).join(' ')
      ).includes(needle)
    })
  }, [items, location, query])

  const sections = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      items: filteredItems.filter((item) => urgencyOf(item.daysLeft) === section.key),
    })).filter((section) => section.items.length > 0)
  }, [filteredItems])

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

  const openProductPreview = useCallback(async (barcode: string) => {
    const requestId = ++previewRequest.current
    setPreviewExpanded(true)
    setPreviewBarcode(barcode)
    setPreviewProduct(null)
    setPreviewLoading(true)
    try {
      const payload = await api<{ product: ProductDetails }>(
        `/api/products/${encodeURIComponent(barcode)}`
      )
      if (requestId !== previewRequest.current) return
      setPreviewProduct(payload.product)
    } catch {
      if (requestId !== previewRequest.current) return
      /** Keep the full page available if a preview request fails. */
      router.visit(`/products/${encodeURIComponent(barcode)}`)
      setPreviewBarcode(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const closeProductPreview = useCallback(() => {
    previewRequest.current += 1
    setPreviewBarcode(null)
    setPreviewProduct(null)
    setPreviewExpanded(true)
  }, [])

  useEffect(() => {
    if (!previewBarcode) return

    let lastScrollY = window.scrollY
    const collapseOnBackgroundScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) < 8) return
      lastScrollY = window.scrollY
      setPreviewExpanded(false)
    }

    window.addEventListener('scroll', collapseOnBackgroundScroll, { passive: true })
    return () => window.removeEventListener('scroll', collapseOnBackgroundScroll)
  }, [previewBarcode])

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
          <div className="space-y-3 border-b border-neutral-800/70 px-4 py-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500">
                ⌕
              </span>
              <input
                ref={searchInputRef}
                type="search"
                name="inventory-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un produit"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 outline-none focus:border-neutral-600"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-0.5">
              <FilterButton active={location === 'all'} onClick={() => setLocation('all')}>
                Tout · {items.length}
              </FilterButton>
              {(Object.keys(LOCATION_LABELS) as ItemLocation[]).map((key) => {
                const count = items.filter((item) => item.location === key).length
                return (
                  <FilterButton
                    key={key}
                    active={location === key}
                    onClick={() => setLocation(key)}
                  >
                    {LOCATION_LABELS[key]} · {count}
                  </FilterButton>
                )
              })}
            </div>
          </div>

          {filteredItems.length === 0 && (
            <div className="px-8 py-16 text-center">
              <p className="text-3xl">🔎</p>
              <p className="mt-3 font-medium">Aucun produit trouvé</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setLocation('all')
                }}
                className="mt-3 text-sm text-emerald-400"
              >
                Effacer les filtres
              </button>
            </div>
          )}

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
                  onEdit={() => setEditing(item)}
                  onOpen={() => void openProductPreview(item.barcode)}
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

      {editing && (
        <EditItemDialog
          key={editing.id}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)).sort(byExpiry)
            )
            setEditing(null)
          }}
          onDeleted={(deleted) => {
            setItems((current) => current.filter((item) => item.id !== deleted.id))
            setEditing(null)
          }}
        />
      )}

      {previewBarcode && (
        <ProductPreviewSheet
          product={previewProduct}
          loading={previewLoading}
          expanded={previewExpanded}
          onClose={closeProductPreview}
          onToggleExpanded={() => setPreviewExpanded((current) => !current)}
          onDetails={() => router.visit(`/products/${encodeURIComponent(previewBarcode)}`)}
        />
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

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
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
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-white text-neutral-950' : 'bg-neutral-900 text-neutral-400'
      }`}
    >
      {children}
    </button>
  )
}

function ProductPreviewSheet({
  product,
  loading,
  expanded,
  onClose,
  onToggleExpanded,
  onDetails,
}: {
  product: ProductDetails | null
  loading: boolean
  expanded: boolean
  onClose: () => void
  onToggleExpanded: () => void
  onDetails: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end" role="presentation">
      <motion.section
        role="dialog"
        aria-labelledby="product-preview-title"
        animate={{ height: expanded ? '58vh' : '18vh' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.8 }}
        onClick={() => {
          if (!expanded) onToggleExpanded()
        }}
        className="pointer-events-auto w-full overflow-y-auto overflow-x-hidden rounded-t-3xl border-t border-neutral-700 bg-neutral-900 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
      >
        <button
          type="button"
          aria-label={expanded ? 'Réduire l’aperçu produit' : 'Déployer l’aperçu produit'}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpanded()
          }}
          className="mx-auto mb-4 block h-5 w-16 rounded-full py-2 active:bg-neutral-800"
        >
          <span className="mx-auto block h-1 w-10 rounded-full bg-neutral-700" />
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500">Aperçu produit</p>
            <h2 id="product-preview-title" className="mt-1 text-lg font-semibold">
              {product?.name ?? 'Chargement…'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fermer l’aperçu produit"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-800 text-lg text-neutral-400 active:bg-neutral-700"
          >
            ×
          </button>
        </div>

        <motion.div
          animate={{ opacity: expanded ? 1 : 0, y: expanded ? 0 : 12 }}
          transition={{ duration: 0.18 }}
          className={expanded ? '' : 'pointer-events-none'}
        >
          {loading || !product ? (
            <div className="flex items-center justify-center py-14 text-sm text-neutral-500">
              Chargement de la composition…
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-start gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-2xl bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-neutral-800 text-2xl">
                    📦
                  </div>
                )}
                <div className="min-w-0">
                  {product.brands && <p className="text-sm text-neutral-400">{product.brands}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.nutriscore && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${previewNutriscoreColor(product.nutriscore)}`}
                      >
                        Nutri-score {product.nutriscore.toUpperCase()}
                      </span>
                    )}
                    {product.novaGroup && (
                      <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                        {novaLabel(product.novaGroup)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-neutral-800/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Indice de composition
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {product.quality.label ?? 'Données insuffisantes'}
                    </p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${compositionScoreTone(product.quality.score)}`}
                  >
                    {product.quality.score === null ? '—' : `${product.quality.score}/100`}
                  </p>
                </div>
                {product.quality.partial && product.quality.score !== null && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    Score partiel · {product.quality.coverage}% des critères disponibles
                  </p>
                )}
              </div>

              {product.ingredientsText ? (
                <div className="mt-5 rounded-2xl bg-neutral-800/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Ingrédients
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                    {product.ingredientsText}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-neutral-500">Composition non renseignée.</p>
              )}

              {product.additives.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Additifs détectés
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.additives.map((additive) => (
                      <span
                        key={additive.code}
                        className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300"
                      >
                        {additive.code.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onDetails}
                className="mt-6 w-full rounded-2xl bg-emerald-500 px-5 py-3.5 text-center font-semibold text-neutral-950 active:bg-emerald-400"
              >
                Détail aliment
              </button>
            </>
          )}
        </motion.div>
      </motion.section>
    </div>
  )
}

function novaLabel(group: number) {
  const labels: Record<number, string> = {
    1: 'Peu transformé',
    2: 'Ingrédient transformé',
    3: 'Transformé',
    4: 'Ultra-transformé',
  }
  return labels[group] ?? `NOVA ${group}`
}

function previewNutriscoreColor(value: string) {
  return PREVIEW_NUTRISCORE_COLORS[value.toLowerCase()] ?? 'bg-neutral-800 text-neutral-300'
}

function compositionScoreTone(score: number | null) {
  if (score === null) return 'text-neutral-400'
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-lime-300'
  if (score >= 25) return 'text-orange-400'
  return 'text-red-400'
}

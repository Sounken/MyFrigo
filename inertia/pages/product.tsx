import { Head, Link } from '@inertiajs/react'
import { useState } from 'react'
import AppShell from '~/components/app_shell'
import EditItemDialog from '~/components/edit_item_dialog'
import { formatDate, relativeLabel, urgencyOf } from '~/lib/dates'
import {
  LOCATION_LABELS,
  type AdditiveInfo,
  type InventoryItem,
  type ProductDetails,
  type ProductExpiryProfile,
} from '~/lib/types'

type Props = {
  product: ProductDetails
  stock: InventoryItem[]
  recentHistory: InventoryItem[]
  stats: { consumed: number; trashed: number }
  expiryProfiles: ProductExpiryProfile[]
}

const NUTRISCORE_COLORS: Record<string, string> = {
  a: 'bg-emerald-600',
  b: 'bg-lime-600',
  c: 'bg-yellow-500 text-neutral-950',
  d: 'bg-orange-500 text-neutral-950',
  e: 'bg-red-600',
}

export default function ProductPage({
  product,
  stock: initialStock,
  recentHistory,
  stats,
  expiryProfiles,
}: Props) {
  const [stock, setStock] = useState(initialStock)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [selectedAdditive, setSelectedAdditive] = useState<AdditiveInfo | null>(null)
  const [showAdditives, setShowAdditives] = useState(false)
  const totalResolved = stats.consumed + stats.trashed

  return (
    <AppShell
      title="Fiche produit"
      action={
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-sm text-emerald-400 active:bg-neutral-800"
        >
          Fermer
        </Link>
      }
    >
      <Head title={product.name} />

      <section className="border-b border-neutral-800 px-4 py-6">
        <div className="flex items-start gap-4">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="size-24 shrink-0 rounded-2xl bg-white object-contain p-2"
            />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-4xl">
              📦
            </div>
          )}

          <div className="min-w-0 pt-1">
            <h2 className="text-xl font-semibold leading-tight">{product.name}</h2>
            {product.brands && <p className="mt-1 text-sm text-neutral-400">{product.brands}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {product.quantityLabel && (
                <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300">
                  {product.quantityLabel}
                </span>
              )}
              {product.nutriscore && NUTRISCORE_COLORS[product.nutriscore.toLowerCase()] && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${NUTRISCORE_COLORS[product.nutriscore.toLowerCase()]}`}
                >
                  Nutri-score {product.nutriscore}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 font-mono text-[11px] text-neutral-600">
          Code-barres · {product.barcode}
        </p>
      </section>

      <CompositionSection
        product={product}
        onSelectAdditive={setSelectedAdditive}
        onShowAdditives={() => setShowAdditives(true)}
      />

      <section className="border-b border-neutral-800 px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">En stock</h2>
          <span className="text-sm text-neutral-500">
            {stock.length} exemplaire{stock.length > 1 ? 's' : ''}
          </span>
        </div>

        {stock.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900 px-4 py-5 text-center text-sm text-neutral-500">
            Ce produit n’est plus dans le frigo.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-800">
            {stock.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEditing(item)}
                className="flex w-full items-center justify-between border-b border-neutral-800 px-4 py-3 text-left last:border-0 active:bg-neutral-900"
              >
                <div>
                  <p className="text-sm font-medium">{LOCATION_LABELS[item.location]}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Date · {formatDate(item.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${urgencyTone(item.daysLeft)}`}>
                    {relativeLabel(item.daysLeft)}
                  </span>
                  <span className="text-neutral-600">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="border-b border-neutral-800 px-4 py-5">
        <h2 className="font-semibold">Durée habituelle</h2>
        <p className="mt-1 text-xs text-neutral-500">
          L’application apprend à partir de tes dates précédentes.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {expiryProfiles.map((profile) => (
            <div key={profile.location} className="rounded-2xl bg-neutral-900 p-3">
              <p className="text-[11px] text-neutral-500">{LOCATION_LABELS[profile.location]}</p>
              <p className="mt-1 text-lg font-semibold">{profile.defaultDays} j</p>
              <p className="mt-0.5 text-[10px] leading-tight text-neutral-600">
                {profile.observations > 0
                  ? `${profile.observations} observation${profile.observations > 1 ? 's' : ''}`
                  : 'estimation'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-neutral-800 px-4 py-5">
        <h2 className="font-semibold">Historique</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard value={stats.consumed} label="mangé" tone="text-emerald-400" />
          <StatCard value={stats.trashed} label="jeté" tone="text-red-400" />
        </div>

        {recentHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            {recentHistory.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">
                  {item.status === 'consumed' ? '✓ Mangé' : '🗑 Jeté'} ·{' '}
                  {LOCATION_LABELS[item.location]}
                </span>
                <span className="text-xs text-neutral-600">
                  {item.resolvedAt
                    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
                        new Date(item.resolvedAt)
                      )
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalResolved === 0 && (
          <p className="mt-3 text-sm text-neutral-500">Pas encore d’historique pour ce produit.</p>
        )}
      </section>

      <div className="px-4 py-5">
        <Link
          href="/scan"
          className="block rounded-2xl bg-emerald-500 px-5 py-3.5 text-center font-semibold text-neutral-950"
        >
          Scanner un autre exemplaire
        </Link>
      </div>

      {editing && (
        <EditItemDialog
          key={editing.id}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setStock((current) =>
              current
                .map((item) => (item.id === updated.id ? updated : item))
                .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
            )
            setEditing(null)
          }}
          onDeleted={(deleted) => {
            setStock((current) => current.filter((item) => item.id !== deleted.id))
            setEditing(null)
          }}
        />
      )}

      {selectedAdditive && (
        <AdditiveSheet additive={selectedAdditive} onClose={() => setSelectedAdditive(null)} />
      )}

      {showAdditives && (
        <AdditivesListSheet
          additives={product.additives}
          onClose={() => setShowAdditives(false)}
          onSelect={(additive) => {
            setShowAdditives(false)
            setSelectedAdditive(additive)
          }}
        />
      )}
    </AppShell>
  )
}

function urgencyTone(daysLeft: number) {
  const urgency = urgencyOf(daysLeft)
  if (urgency === 'expired') return 'text-red-400'
  if (urgency === 'today') return 'text-orange-400'
  if (urgency === 'soon') return 'text-amber-300'
  return 'text-neutral-300'
}

function StatCard({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-4">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">fois {label}</p>
    </div>
  )
}

function CompositionSection({
  product,
  onSelectAdditive,
  onShowAdditives,
}: {
  product: ProductDetails
  onSelectAdditive: (additive: AdditiveInfo) => void
  onShowAdditives: () => void
}) {
  const { quality } = product
  const additivePresence = additivePresenceScore(product.additives.length)

  if (!product.compositionAvailable) {
    return (
      <section className="border-b border-neutral-800 px-4 py-5">
        <h2 className="font-semibold">Composition</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Aucune donnée de composition n’est disponible pour ce produit. La note n’est donc pas
          calculée.
        </p>
      </section>
    )
  }

  return (
    <section className="border-b border-neutral-800 px-4 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Indice composition</h2>
          <p className="mt-1 text-[10px] text-neutral-500">
            Nutrition 60 % · Transformation 20 % · Additifs : présence
          </p>
        </div>
        <div className={`shrink-0 text-right ${scoreTone(quality.score)}`}>
          <p className="text-2xl font-bold leading-none">
            {quality.score === null ? '—' : quality.score}
            {quality.score !== null && <span className="text-xs font-normal">/100</span>}
          </p>
          <p className="mt-1 text-[10px] font-medium">{quality.label ?? 'Données insuffisantes'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-2xl bg-neutral-900 p-4">
        {quality.components.map((component) => {
          const isClickableAdditives = component.id === 'additives' && product.additives.length > 0
          const content = (
            <>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-300">{component.label}</span>
                <span className="text-neutral-500">
                  {component.score === null
                    ? component.id === 'additives'
                      ? product.additivesTags.length > 0
                        ? `${product.additives.length} fiche${product.additives.length > 1 ? 's' : ''} · présence ${additivePresence}%`
                        : 'non renseigné'
                      : 'non renseigné'
                    : `${Math.round(component.score)}/100`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                {component.score !== null ? (
                  <div
                    className={`h-full rounded-full ${scoreBar(component.score)}`}
                    style={{ width: `${component.score}%` }}
                  />
                ) : component.id === 'additives' && additivePresence > 0 ? (
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${additivePresence}%` }}
                  />
                ) : null}
              </div>
            </>
          )

          return (
            <div key={component.id}>
              {isClickableAdditives ? (
                <button
                  type="button"
                  onClick={onShowAdditives}
                  className="block w-full rounded-lg text-left active:bg-neutral-800/70"
                  aria-label="Afficher les additifs détectés"
                >
                  {content}
                </button>
              ) : (
                content
              )}
              {component.title && (
                <p className="mt-1 text-[10px] text-neutral-600">{component.title}</p>
              )}
            </div>
          )
        })}
      </div>

      {quality.partial && quality.score !== null && (
        <p className="mt-2 text-[11px] text-amber-400">
          Score partiel · {quality.coverage}% des critères disponibles
        </p>
      )}

      {product.additivesTags.length > 0 && (
        <p className="mt-2 text-[11px] text-neutral-500">
          Le nombre d’additifs indique leur présence, pas leur dangerosité. MyFrigo n’applique pas
          de pénalité sans classification de risque documentée.
        </p>
      )}

      {product.nutriments && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Valeurs pour 100 g
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
            <Nutrient label="Énergie" value={product.nutriments.energyKcal} unit="kcal" />
            <Nutrient label="Matières grasses" value={product.nutriments.fat} unit="g" />
            <Nutrient label="dont saturées" value={product.nutriments.saturatedFat} unit="g" />
            <Nutrient label="Glucides" value={product.nutriments.carbohydrates} unit="g" />
            <Nutrient label="dont sucres" value={product.nutriments.sugars} unit="g" />
            <Nutrient label="Fibres" value={product.nutriments.fiber} unit="g" />
            <Nutrient label="Protéines" value={product.nutriments.proteins} unit="g" />
            <Nutrient label="Sel" value={product.nutriments.salt} unit="g" />
          </div>
        </div>
      )}

      {product.ingredientsText && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Ingrédients
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">{product.ingredientsText}</p>
        </div>
      )}

      {(product.allergensTags.length > 0 || product.additivesTags.length > 0) && (
        <div className="mt-5 space-y-2 rounded-2xl border border-neutral-800 p-3 text-xs">
          {product.allergensTags.length > 0 && (
            <p>
              <span className="text-neutral-500">Allergènes · </span>
              <span className="text-amber-300">
                {product.allergensTags.map(formatFoodTag).join(', ')}
              </span>
            </p>
          )}
          <div>
            <p className="text-neutral-500">Additifs ·</p>
            {product.additives.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {product.additives.map((additive) => (
                  <button
                    key={additive.code}
                    type="button"
                    onClick={() => onSelectAdditive(additive)}
                    className={`rounded-full px-3 py-1.5 font-medium transition-colors active:opacity-70 ${additiveChip(additive.riskLevel)}`}
                  >
                    {additive.code.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-neutral-300">aucun déclaré</p>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-neutral-600">
        Indice informatif calculé à partir des attributs Open Food Facts, distinct de Yuka et non
        médical. Les données sont collaboratives : en cas d’allergie, vérifie toujours l’emballage.
      </p>
    </section>
  )
}

function Nutrient({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value === null) return null
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-neutral-900 pb-1 text-xs">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-300">
        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} {unit}
      </span>
    </div>
  )
}

function scoreTone(score: number | null) {
  if (score === null) return 'text-neutral-500'
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-lime-400'
  if (score >= 25) return 'text-orange-400'
  return 'text-red-400'
}

function scoreBar(score: number) {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-lime-500'
  if (score >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

const FOOD_TAG_LABELS: Record<string, string> = {
  nuts: 'fruits à coque',
  milk: 'lait',
  eggs: 'œufs',
  peanuts: 'arachides',
  soybeans: 'soja',
  gluten: 'gluten',
  celery: 'céleri',
  mustard: 'moutarde',
  fish: 'poisson',
  crustaceans: 'crustacés',
  molluscs: 'mollusques',
}

function formatFoodTag(tag: string) {
  const value = tag.replace(/^[a-z]{2}:/, '')
  return FOOD_TAG_LABELS[value] ?? value.replaceAll('-', ' ')
}

function additiveChip(level: AdditiveInfo['riskLevel']) {
  if (level === 'low') return 'bg-yellow-500/15 text-yellow-300'
  if (level === 'attention') return 'bg-orange-500/15 text-orange-300'
  if (level === 'dangerous') return 'bg-red-500/15 text-red-300'
  return 'bg-neutral-800 text-neutral-300'
}

/** Presence indicator only: it never contributes to the product quality score. */
function additivePresenceScore(count: number) {
  if (count <= 0) return 0
  return Math.min(100, Math.max(65, count * 20))
}

function AdditiveSheet({ additive, onClose }: { additive: AdditiveInfo; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/60"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="additive-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full rounded-t-3xl border-t border-neutral-700 bg-neutral-900 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-emerald-400">{additive.code.toUpperCase()}</p>
            <h2 id="additive-title" className="mt-1 text-lg font-semibold">
              {additive.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fermer la fiche additif"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-800 text-lg text-neutral-400 active:bg-neutral-700"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${additiveChip(additive.riskLevel)}`}
          >
            {additive.riskLabel}
          </span>
          <span className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
            {additive.functionLabel}
          </span>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-neutral-300">{additive.description}</p>
        <p className="mt-4 text-[11px] leading-relaxed text-neutral-600">
          Ce niveau est une synthèse prudente du référentiel MyFrigo, distincte d’un avis médical.
          L’autorisation européenne dépend toujours des conditions d’emploi et de l’exposition.
        </p>
        <a
          href={additive.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-xs text-emerald-400 underline"
        >
          Voir la source européenne
        </a>
      </section>
    </div>
  )
}

function AdditivesListSheet({
  additives,
  onClose,
  onSelect,
}: {
  additives: AdditiveInfo[]
  onClose: () => void
  onSelect: (additive: AdditiveInfo) => void
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/60"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="additives-list-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full rounded-t-3xl border-t border-neutral-700 bg-neutral-900 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500">Composition</p>
            <h2 id="additives-list-title" className="mt-1 text-lg font-semibold">
              Additifs détectés
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fermer la liste des additifs"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-800 text-lg text-neutral-400 active:bg-neutral-700"
          >
            ×
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-neutral-500">
          Appuie sur un code pour voir sa fonction et son niveau de risque.
        </p>
        <div className="mt-4 space-y-2">
          {additives.map((additive) => (
            <button
              key={additive.code}
              type="button"
              onClick={() => onSelect(additive)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-neutral-800 px-4 py-3 text-left active:bg-neutral-700"
            >
              <span>
                <span className="block font-mono text-sm text-neutral-200">
                  {additive.code.toUpperCase()}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-400">{additive.name}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${additiveChip(additive.riskLevel)}`}
              >
                {additive.riskLabel.split(' · ')[0]}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

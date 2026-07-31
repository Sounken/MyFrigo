import { Head, Link } from '@inertiajs/react'
import { useState } from 'react'
import AppShell from '~/components/app_shell'
import EditItemDialog from '~/components/edit_item_dialog'
import { formatDate, relativeLabel, urgencyOf } from '~/lib/dates'
import {
  LOCATION_LABELS,
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

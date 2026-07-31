import { Head } from '@inertiajs/react'
import AppShell, { LogoutButton } from '~/components/app_shell'
import type { ResolutionStats, WasteStats } from '~/lib/types'

export default function StatsPage({ stats }: { stats: WasteStats }) {
  return (
    <AppShell title="Bilan anti-gaspi" action={<LogoutButton />}>
      <Head title="Bilan anti-gaspi" />

      <div className="space-y-6 px-4 py-5">
        <section className="grid grid-cols-3 gap-2">
          <Metric value={stats.inventory.total} label="en stock" />
          <Metric value={stats.inventory.urgent} label="à surveiller" tone="text-amber-300" />
          <Metric value={stats.inventory.expired} label="périmés" tone="text-red-400" />
        </section>

        <ResolutionCard title="Ces 30 derniers jours" stats={stats.last30Days} featured />
        <ResolutionCard title="Depuis le début" stats={stats.allTime} />

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Les plus jetés</h2>
            <span className="text-xs text-neutral-500">à éviter en priorité</span>
          </div>

          {stats.topWasted.length === 0 ? (
            <p className="py-5 text-center text-sm text-neutral-500">
              Aucun gaspillage enregistré. Continue comme ça 🌱
            </p>
          ) : (
            <ol className="space-y-3">
              {stats.topWasted.map((product, index) => (
                <li key={product.name} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs text-neutral-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-red-400">
                    {product.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="px-2 pb-4 text-center text-xs leading-relaxed text-neutral-600">
          Chaque swipe « mangé » ou « jeté » améliore ce bilan et les prochaines estimations.
        </p>
      </div>
    </AppShell>
  )
}

function Metric({
  value,
  label,
  tone = 'text-white',
}: {
  value: number
  label: string
  tone?: string
}) {
  return (
    <div className="rounded-2xl bg-neutral-900 px-2 py-4 text-center">
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] text-neutral-500">{label}</p>
    </div>
  )
}

function ResolutionCard({
  title,
  stats,
  featured = false,
}: {
  title: string
  stats: ResolutionStats
  featured?: boolean
}) {
  const consumedShare = stats.total === 0 ? 0 : Math.round((stats.consumed / stats.total) * 100)

  return (
    <section
      className={`rounded-2xl border p-4 ${
        featured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-900'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {stats.total === 0
              ? 'Pas encore assez de sorties'
              : `${stats.total} produit${stats.total > 1 ? 's' : ''} sorti${stats.total > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-2xl font-bold tabular-nums ${stats.wasteRate <= 10 ? 'text-emerald-400' : stats.wasteRate <= 25 ? 'text-amber-300' : 'text-red-400'}`}
          >
            {stats.wasteRate}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">gaspillé</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-red-500/30">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${consumedShare}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-emerald-400">
          ✓ {stats.consumed} mangé{stats.consumed > 1 ? 's' : ''}
        </span>
        <span className="text-red-400">
          {stats.trashed} jeté{stats.trashed > 1 ? 's' : ''}
        </span>
      </div>
    </section>
  )
}

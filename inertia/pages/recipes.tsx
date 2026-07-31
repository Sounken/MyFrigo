import { Head, Link } from '@inertiajs/react'
import { useState } from 'react'
import AppShell from '~/components/app_shell'
import { relativeLabel } from '~/lib/dates'
import type { RecipeSuggestion } from '~/lib/types'

type UrgentItem = {
  id: number
  barcode: string
  name: string
  imageUrl: string | null
  daysLeft: number
}

type Props = {
  recipes: RecipeSuggestion[]
  urgentItems: UrgentItem[]
  inventoryCount: number
}

export default function RecipesPage({ recipes, urgentItems, inventoryCount }: Props) {
  const [openRecipe, setOpenRecipe] = useState<string | null>(recipes[0]?.id ?? null)

  return (
    <AppShell title="Idées recettes">
      <Head title="Idées recettes" />

      {inventoryCount === 0 ? (
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <span className="text-5xl">🍽️</span>
          <h2 className="mt-5 text-lg font-semibold">Rien à cuisiner pour le moment</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Les idées apparaîtront dès que tu auras scanné quelques produits.
          </p>
          <Link
            href="/scan"
            className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3.5 font-semibold text-neutral-950"
          >
            Scanner des produits
          </Link>
        </div>
      ) : (
        <>
          <section className="border-b border-neutral-800 px-4 py-5">
            <p className="text-sm leading-relaxed text-neutral-400">
              Des idées calculées avec ton stock, en plaçant en premier ce qui doit être mangé
              rapidement.
            </p>

            {urgentItems.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                  À cuisiner d’abord
                </h2>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {urgentItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/products/${encodeURIComponent(item.barcode)}`}
                      className="flex w-32 shrink-0 items-center gap-2 rounded-2xl bg-neutral-900 p-2.5 active:bg-neutral-800"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800">
                          📦
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{item.name}</span>
                        <span className="block text-[10px] text-orange-400">
                          {relativeLabel(item.daysLeft)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 px-4 py-5">
            {recipes.map((recipe) => {
              const open = openRecipe === recipe.id
              return (
                <article key={recipe.id} className="overflow-hidden rounded-3xl bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => setOpenRecipe(open ? null : recipe.id)}
                    aria-expanded={open}
                    className="w-full p-4 text-left active:bg-neutral-800"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-800 text-2xl">
                        {recipe.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-semibold">{recipe.title}</h2>
                          <span className="text-neutral-500">{open ? '−' : '+'}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                          {recipe.description}
                        </p>
                        <p className="mt-2 text-xs font-medium text-emerald-400">
                          {recipe.ingredients.length} produit
                          {recipe.ingredients.length > 1 ? 's' : ''} de ton stock
                        </p>
                      </div>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-neutral-800 px-4 pb-5 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        À utiliser
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recipe.ingredients.map((ingredient) => (
                          <Link
                            key={ingredient.barcode}
                            href={`/products/${encodeURIComponent(ingredient.barcode)}`}
                            className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300"
                          >
                            {ingredient.name}
                            {ingredient.daysLeft <= 4 && ` · ${relativeLabel(ingredient.daysLeft)}`}
                          </Link>
                        ))}
                      </div>

                      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Du placard
                      </h3>
                      <p className="mt-2 text-sm text-neutral-400">
                        {recipe.complements.join(' · ')}
                      </p>

                      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Préparation
                      </h3>
                      <ol className="mt-3 space-y-3">
                        {recipe.steps.map((step, index) => (
                          <li
                            key={step}
                            className="flex gap-3 text-sm leading-relaxed text-neutral-300"
                          >
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs text-neutral-400">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              )
            })}
          </section>

          <p className="px-6 pb-7 text-center text-[11px] leading-relaxed text-neutral-600">
            Suggestions indicatives : vérifie toujours l’état et la cuisson des aliments avant de
            les consommer.
          </p>
        </>
      )}
    </AppShell>
  )
}

import { Head, useForm, usePage } from '@inertiajs/react'
import type { FormEvent } from 'react'

export default function LoginPage() {
  const { flash } = usePage().props as { flash?: Record<string, any> }
  const form = useForm({ password: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post('/login', { onFinish: () => form.reset('password') })
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-8">
      <Head title="Connexion" />

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-5xl">🧊</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">MyFrigo</h1>
          <p className="mt-1 text-sm text-neutral-500">L’inventaire de mon frigo.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            name="password"
            value={form.data.password}
            onChange={(event) => form.setData('password', event.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            enterKeyHint="go"
            autoFocus
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 outline-none focus:border-neutral-600"
          />

          {(flash?.error || form.errors.password) && (
            <p className="px-1 text-sm text-red-400">{flash?.error ?? form.errors.password}</p>
          )}

          <button
            type="submit"
            disabled={form.processing || !form.data.password}
            className="w-full rounded-2xl bg-emerald-500 py-3.5 font-semibold text-neutral-950 disabled:opacity-40"
          >
            {form.processing ? 'Connexion…' : 'Entrer'}
          </button>
        </form>
      </div>
    </div>
  )
}

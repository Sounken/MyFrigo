import { Head, Link } from '@inertiajs/react'
import AppShell from '~/components/app_shell'

type Props = {
  security: { authDisabled: boolean }
  notifications: { configured: boolean; subscriptions: number }
}

export default function SettingsPage({ security, notifications }: Props) {
  return (
    <AppShell
      title="Réglages"
      action={
        <Link href="/stats" className="rounded-full px-3 py-1.5 text-xs text-neutral-400">
          Bilan
        </Link>
      }
    >
      <Head title="Réglages" />

      <div className="space-y-5 px-4 py-5">
        <section
          className={`rounded-2xl border p-4 ${
            security.authDisabled
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{security.authDisabled ? '🔓' : '🔒'}</span>
            <div>
              <h2 className="font-semibold">
                {security.authDisabled ? 'Application publique' : 'Application protégée'}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                {security.authDisabled
                  ? 'AUTH_DISABLED=true : toute personne qui connaît l’adresse peut modifier le frigo.'
                  : 'Le mot de passe est demandé avant tout accès aux données.'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Notifications</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {notifications.configured
                  ? `${notifications.subscriptions} appareil${notifications.subscriptions > 1 ? 's' : ''} abonné${notifications.subscriptions > 1 ? 's' : ''}`
                  : 'Clés VAPID non configurées'}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                notifications.configured
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {notifications.configured ? 'Prêtes' : 'Inactives'}
            </span>
          </div>
          {notifications.configured && (
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              Coolify doit exécuter <code>node ace notify:expiring</code> chaque jour pour envoyer
              le récapitulatif.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-semibold">Sauvegarde des données</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-400">
            Télécharge les produits, les exemplaires, l’historique et la liste de courses dans un
            fichier JSON portable.
          </p>
          <a
            href="/api/export"
            download
            className="mt-4 flex items-center justify-center rounded-xl bg-white py-3 text-sm font-semibold text-neutral-950"
          >
            Télécharger une sauvegarde
          </a>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-semibold">Installation iPhone</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-400">
            Dans Safari : Partager → « Sur l’écran d’accueil ». L’app s’ouvrira en plein écran et
            pourra recevoir les notifications.
          </p>
        </section>
      </div>
    </AppShell>
  )
}

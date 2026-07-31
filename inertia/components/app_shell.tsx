import { Link, router } from '@inertiajs/react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  action?: ReactNode
  children: ReactNode
}

/**
 * The three daily destinations stay reachable with a thumb.
 */
export default function AppShell({ title, action, children }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-950">
      <header className="sticky top-0 z-20 border-b border-neutral-800/80 bg-neutral-950/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {action}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <nav className="sticky bottom-0 z-20 border-t border-neutral-800/80 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-3">
          <NavLink href="/" label="Frigo" icon="🧊" />
          <NavLink href="/scan" label="Scanner" icon="📷" />
          <NavLink href="/stats" label="Bilan" icon="📊" />
        </div>
      </nav>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const active = pathname === href || (href === '/stats' && pathname === '/history')

  return (
    <Link
      href={href}
      className={`no-tap-select flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
        active ? 'text-white' : 'text-neutral-500'
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      {label}
    </Link>
  )
}

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => router.post('/logout')}
      className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 active:bg-neutral-800"
    >
      Déconnexion
    </button>
  )
}

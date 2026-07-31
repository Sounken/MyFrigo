import { useEffect, useState } from 'react'

export default function ConnectionBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])

  if (online) return null

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
      Hors connexion · les modifications reprendront quand le réseau sera revenu
    </div>
  )
}

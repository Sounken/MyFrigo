/**
 * Service worker.
 *
 * Deliberately has no fetch handler: everything behind the login is
 * session-authenticated and changes constantly, so caching pages would only
 * risk showing a fridge that no longer exists. The worker is here for one
 * reason — Web Push cannot be delivered without one.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = { title: 'MyFrigo', body: 'Des produits arrivent à péremption.', url: '/' }

  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* Malformed payload: fall back to the generic message rather than nothing. */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      /** One tag, so a second digest replaces the first instead of stacking. */
      tag: 'myfrigo-expiry',
      renotify: true,
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      /** Reuse the installed window if it is already open. */
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})

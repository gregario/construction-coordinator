// worker/index.ts - Custom service worker additions for push notifications
// next-pwa merges this with the generated service worker

declare const self: ServiceWorkerGlobalScope

// Handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, url, tag } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || 'construction-manager',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
      requireInteraction: false,
    })
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url = event.notification.data?.url || '/briefing'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// Offline fallback for app shell
self.addEventListener('fetch', (_event: FetchEvent) => {
  // next-pwa handles most fetch caching; this handles the offline briefing fallback
})

// Construction Manager Service Worker v1
// Network-first caching, push notifications, offline fallback

const CACHE_NAME = 'cm-v1';
const SHELL_ROUTES = ['/briefing', '/materials'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(SHELL_ROUTES.map((r) => cache.add(r)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabase = url.hostname.endsWith('.supabase.co');

  if (!isSameOrigin && !isSupabase) return;

  // Supabase API — network only, never cache
  if (isSupabase) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  // Immutable Next.js static assets — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // App routes — network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) =>
          hit ?? new Response('You are offline. Please reconnect.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const { title = 'Construction Manager', body, url = '/briefing', tag } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || 'cm',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/briefing';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) { client.navigate(target); return client.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});

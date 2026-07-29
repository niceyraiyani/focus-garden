/*
 * lock.in service worker — offline support via runtime caching.
 * No gradients here, just caches. :)
 * - navigations: network-first, fall back to cached shell when offline
 * - same-origin GET assets: stale-while-revalidate
 */
const CACHE = 'focus-garden-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req)
          const cache = await caches.open(CACHE)
          cache.put(req, net.clone())
          return net
        } catch {
          const cached = await caches.match(req)
          return cached || (await caches.match(self.registration.scope)) || Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req)
      if (cached) {
        // Refresh in the background without blocking the response.
        fetch(req)
          .then((net) => caches.open(CACHE).then((c) => c.put(req, net)))
          .catch(() => {})
        return cached
      }
      try {
        const net = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put(req, net.clone())
        return net
      } catch {
        return Response.error()
      }
    })(),
  )
})

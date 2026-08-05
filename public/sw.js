/*
 * lock.in service worker — offline support via runtime caching.
 * No gradients here, just caches. :)
 * - navigations: network-first, fall back to cached shell when offline
 * - same-origin GET assets: stale-while-revalidate
 */
const CACHE = 'lockin-v1'

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

/* ---------------------------------------------------------------------------
 * Reminders
 *
 * Showing notifications through the service worker rather than `new
 * Notification()` means they survive the tab closing, land in the OS tray, and
 * work on Android (where the constructor throws outright).
 *
 * Periodic Background Sync then lets a nudge fire with lock.in fully closed.
 * It's Chromium-only, needs the app installed, and the browser decides how
 * often it actually runs — so it's a bonus on top of the in-app timer, never
 * the thing we promise.
 * ------------------------------------------------------------------------ */

const DB_NAME = 'focus-garden'
const NUDGE_TAG = 'lockin-daily-nudge'

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'notify') return
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || NUDGE_TAG,
      icon: new URL('icon-192.png', self.registration.scope).href,
      badge: new URL('icon-192.png', self.registration.scope).href,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of clients) {
        if (c.url.startsWith(scope) && 'focus' in c) return c.focus()
      }
      return self.clients.openWindow(scope)
    })(),
  )
})

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function readAll(db, store) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) return resolve([])
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => resolve([])
  })
}

function dateKey(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * The same rules as the in-app nudge: once a day, after the chosen time, and
 * only when you haven't already started. Duplicated here rather than imported
 * because a service worker can't share the app bundle — the app's copy is the
 * tested one, and this is the fallback for when nothing is running.
 */
async function maybeNudge() {
  let db
  try {
    db = await openDb()
  } catch {
    return
  }

  const [settingsRows, tasks, segments] = await Promise.all([
    readAll(db, 'settings'),
    readAll(db, 'tasks'),
    readAll(db, 'segments'),
  ])
  const settings = settingsRows[0]
  db.close()
  if (!settings || !settings.dailyNudge) return

  const now = new Date()
  const today = dateKey(now.getTime())
  if (settings.nudgeLastFiredOn === today) return

  const at = /^(\d{1,2}):(\d{2})$/.exec(String(settings.dailyNudgeAt || '09:00'))
  if (!at) return
  if (now.getHours() * 60 + now.getMinutes() < Number(at[1]) * 60 + Number(at[2])) return

  // Already worked today? Then there's nothing worth interrupting for.
  const focusedToday = segments.some((s) => s.endedAt && dateKey(s.startedAt) === today)
  if (focusedToday) return

  const open = tasks.filter(
    (t) => t.status === 'open' && !(t.hiddenUntil && t.hiddenUntil > today),
  )
  if (open.length === 0) return
  const due = open.filter((t) => t.dueDate && t.dueDate <= today).length

  await self.registration.showNotification(due > 0 ? `${due} due today` : 'Time to lock in', {
    body:
      due > 0
        ? 'Pick one and lock in — even fifteen minutes counts.'
        : 'Nothing is due, so pick whatever you feel like starting.',
    tag: NUDGE_TAG,
    icon: new URL('icon-192.png', self.registration.scope).href,
    badge: new URL('icon-192.png', self.registration.scope).href,
  })

  // Record it so the app doesn't fire a second one when you next open it.
  try {
    const db2 = await openDb()
    const tx = db2.transaction('settings', 'readwrite')
    tx.objectStore('settings').put({ ...settings, nudgeLastFiredOn: today })
    tx.oncomplete = () => db2.close()
  } catch {
    // Worst case the app repeats the nudge once; not worth failing over.
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-nudge') event.waitUntil(maybeNudge())
})

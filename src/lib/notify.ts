/**
 * Desktop/browser notifications.
 *
 * Kept deliberately small: notifications only work while lock.in is running,
 * because there's no push server. In the desktop app that's most of the day;
 * in a browser tab it's whenever the tab is open. Everything here fails quietly
 * when notifications aren't available or permitted.
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === 'granted'
}

/** Ask once. Returns whether we ended up allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

interface NotifyOptions {
  body?: string
  /** Replaces any earlier notification with the same tag instead of stacking. */
  tag?: string
}

/**
 * Show a notification, bringing the app forward if it's clicked.
 *
 * Prefers the service worker: those notifications outlive the tab, land in the
 * OS tray, and work on Android, where `new Notification()` throws outright.
 */
export async function notify(title: string, { body, tag }: NotifyOptions = {}): Promise<void> {
  if (!notificationsGranted()) return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      reg.active?.postMessage({ type: 'notify', title, body, tag })
      return
    }
  } catch {
    // Fall through to the in-page notification below.
  }
  try {
    const n = new Notification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon-192.png` })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Some browsers only allow notifications from a service worker; there's
    // nothing useful to do about it here.
  }
}

/**
 * Ask the browser to wake us periodically so a reminder can fire with lock.in
 * closed. Chromium-only, installed PWAs only, and the browser decides the real
 * frequency — so this is a bonus, never the thing we rely on.
 */
export async function enableBackgroundNudge(): Promise<boolean> {
  try {
    const reg = (await navigator.serviceWorker?.ready) as
      | (ServiceWorkerRegistration & { periodicSync?: { register: (t: string, o: object) => Promise<void> } })
      | undefined
    if (!reg?.periodicSync) return false
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state !== 'granted') return false
    await reg.periodicSync.register('daily-nudge', { minInterval: 12 * 60 * 60 * 1000 })
    return true
  } catch {
    return false
  }
}

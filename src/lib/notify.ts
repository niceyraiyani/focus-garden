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

/** Show a notification, bringing the app forward if it's clicked. */
export function notify(title: string, { body, tag }: NotifyOptions = {}): void {
  if (!notificationsGranted()) return
  try {
    const n = new Notification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon-192.png` })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Some browsers throw when constructing notifications outside a service
    // worker; there's nothing useful to do about it here.
  }
}

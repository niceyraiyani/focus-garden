import { useEffect, useRef } from 'react'
import { useActiveSession } from './useFocusSession'
import { touchSession, reconcileAbandonedSession } from '../../data/sessions'
import { useToast } from '../../components/ToastContext'
import { formatMinutes } from '../../lib/time'

const HEARTBEAT_MS = 20_000

/**
 * Keeps a focus session tied to your actual presence.
 *
 * While the app is open and visible we write a heartbeat. Any gap longer than
 * the grace period — the machine slept, the tab was closed, the browser was
 * killed — means you weren't there, so the session is closed at the last
 * moment we saw you and the gap never lands in your stats.
 *
 * Two rules keep this honest:
 *  - Always reconcile *before* touching. Refreshing the heartbeat first would
 *    erase the very gap we need to detect, so a phone locked overnight would
 *    bank the whole night as focus time.
 *  - No tab ends a session just because it closed. With two tabs open, one
 *    closing doesn't mean you left, and the surviving tab keeps heart-beating.
 *    A genuinely abandoned session is caught on the next launch instead.
 */
export function useSessionPresence(): void {
  const session = useActiveSession()
  const { toast } = useToast()
  const running = session?.status === 'running'
  const sessionId = session?.id
  const reconciled = useRef(false)

  // On launch, close anything left running from last time.
  useEffect(() => {
    if (reconciled.current) return
    reconciled.current = true
    void reconcileAbandonedSession().then((mins) => {
      if (mins !== null) {
        toast(`Picked up where you left off — last session saved as ${formatMinutes(mins)}.`)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!running || !sessionId) return

    // Reconcile first: if we've been away longer than the grace period this
    // closes the session, and there's nothing left to heart-beat.
    const beat = async () => {
      if (document.visibilityState !== 'visible') return
      const closed = await reconcileAbandonedSession()
      if (closed !== null) {
        toast(`Welcome back — that session was saved as ${formatMinutes(closed)}.`)
        return
      }
      await touchSession(sessionId)
    }

    void beat()
    const id = window.setInterval(() => void beat(), HEARTBEAT_MS)
    const onVisible = () => void beat()
    document.addEventListener('visibilitychange', onVisible)
    // Also fired when a page is restored from the back/forward cache, which
    // can follow a long suspension.
    window.addEventListener('pageshow', onVisible)

    // Record that we were here right up to the moment the tab goes away. We
    // deliberately don't end the session: another tab may still be open, and
    // a session left behind gets closed at this timestamp on the next launch.
    const onLeave = () => {
      void touchSession(sessionId)
    }
    window.addEventListener('pagehide', onLeave)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
      window.removeEventListener('pagehide', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sessionId])
}

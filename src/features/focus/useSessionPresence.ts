import { useEffect, useRef } from 'react'
import { useActiveSession } from './useFocusSession'
import { touchSession, reconcileAbandonedSession, endSessionAt } from '../../data/sessions'
import { useToast } from '../../components/ToastContext'
import { formatMinutes } from '../../lib/time'

const HEARTBEAT_MS = 20_000

/**
 * Keeps a focus session tied to your actual presence.
 *
 * While the app is open we write a heartbeat; when it closes we end the
 * session on the spot. If the app dies without warning (crash, shutdown, phone
 * sleep), the next launch closes the session at the last heartbeat — so time
 * you were away never lands in your stats.
 */
export function useSessionPresence(): void {
  const session = useActiveSession()
  const { toast } = useToast()
  const running = session?.status === 'running'
  const sessionId = session?.id
  const reconciled = useRef(false)

  // On launch, clean up anything left running from last time.
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

  // Heartbeat while running, plus one on becoming visible again.
  useEffect(() => {
    if (!running || !sessionId) return
    void touchSession(sessionId)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void touchSession(sessionId)
    }, HEARTBEAT_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void touchSession(sessionId)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [running, sessionId])

  // Closing the tab or app ends the session then and there.
  useEffect(() => {
    if (!running || !sessionId) return
    const onLeave = () => {
      void endSessionAt(sessionId, Date.now())
    }
    window.addEventListener('pagehide', onLeave)
    return () => window.removeEventListener('pagehide', onLeave)
  }, [running, sessionId])
}

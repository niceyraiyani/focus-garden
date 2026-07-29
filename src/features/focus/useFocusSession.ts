import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { FocusSession, FocusSegment, Task } from '../../domain/types'

/** The single running or paused session, if any. */
export function useActiveSession(): FocusSession | undefined {
  return useLiveQuery(async () => {
    const running = await db.sessions.where('status').equals('running').first()
    if (running) return running
    return db.sessions.where('status').equals('paused').first()
  }, [])
}

export function useSessionSegments(sessionId: string | undefined): FocusSegment[] {
  return useLiveQuery(
    () =>
      sessionId
        ? db.segments.where('sessionId').equals(sessionId).toArray()
        : Promise.resolve<FocusSegment[]>([]),
    [sessionId],
    [] as FocusSegment[],
  )
}

/** Tasks for a set of ids, returned filtered to those that still exist. */
export function useTasksByIds(ids: string[]): Task[] {
  const key = ids.join(',')
  return useLiveQuery(
    async () => {
      const found = await db.tasks.bulkGet(ids)
      return found.filter((t): t is Task => !!t)
    },
    [key],
    [],
  )
}

/**
 * A ticking clock that re-renders on an interval. Pass `active=false` to
 * pause updates (e.g. when the session is paused) and save renders.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) {
      setNow(Date.now())
      return
    }
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    // Also refresh immediately when the tab becomes visible again, so the
    // timer catches up after the browser throttled/suspended it.
    const onVis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active, intervalMs])
  return now
}

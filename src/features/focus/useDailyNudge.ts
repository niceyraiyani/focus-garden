import { useEffect, useRef } from 'react'
import { db } from '../../data/db'
import { useSettings } from '../../app/SettingsContext'
import { localDateKey } from '../../lib/date'
import { notify } from '../../lib/notify'
import { todayFocusedMs } from '../insights/aggregations'
import { decideNudge } from './nudge'

const LAST_FIRED_KEY = 'lockin.nudge.lastFiredOn'

function readLastFired(): string | null {
  try {
    return localStorage.getItem(LAST_FIRED_KEY)
  } catch {
    return null
  }
}

function writeLastFired(dateKey: string): void {
  try {
    localStorage.setItem(LAST_FIRED_KEY, dateKey)
  } catch {
    // Private-mode storage failures shouldn't break the app; the worst case is
    // the nudge repeating, which the in-memory guard below still prevents.
  }
}

/**
 * Fires one gentle notification a day, at the user's chosen time, if they
 * haven't started working yet.
 *
 * Only runs while lock.in is open — there's no push server. That's the main
 * reason the desktop app exists.
 */
export function useDailyNudge(): void {
  const { settings } = useSettings()
  const enabled = settings?.dailyNudge ?? false
  const at = settings?.dailyNudgeAt ?? '09:00'
  // Guards against a second notification if localStorage is unavailable.
  const firedThisRun = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function check() {
      const now = new Date()
      const todayKey = localDateKey(now.getTime())
      if (firedThisRun.current === todayKey) return

      const [segments, tasks, running] = await Promise.all([
        db.segments.toArray(),
        db.tasks.filter((t) => t.status === 'open').toArray(),
        db.sessions.filter((s) => s.status === 'running' || s.status === 'paused').count(),
      ])
      if (cancelled) return

      const nudge = decideNudge({
        enabled: true,
        at,
        lastFiredOn: readLastFired(),
        todayKey,
        minutesNow: now.getHours() * 60 + now.getMinutes(),
        sessionRunning: running > 0,
        focusedMsToday: todayFocusedMs(segments, now.getTime()),
        dueCount: tasks.filter((t) => t.dueDate !== null && t.dueDate <= todayKey).length,
        inboxCount: tasks.filter((t) => (t.listId ?? null) === null).length,
        openCount: tasks.length,
      })
      if (!nudge || cancelled) return

      firedThisRun.current = todayKey
      writeLastFired(todayKey)
      notify(nudge.title, { body: nudge.body, tag: 'lockin-daily-nudge' })
    }

    check()
    const id = setInterval(check, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, at])
}

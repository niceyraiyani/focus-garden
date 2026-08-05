import { useEffect, useRef } from 'react'
import { db } from '../../data/db'
import { useSettings } from '../../app/SettingsContext'
import { localDateKey } from '../../lib/date'
import { notify, enableBackgroundNudge } from '../../lib/notify'
import { todayFocusedMs } from '../insights/aggregations'
import { decideNudge } from './nudge'

/**
 * Fires one gentle notification a day, at the user's chosen time, if they
 * haven't started working yet.
 *
 * The "already fired today" marker lives in the settings record rather than
 * localStorage so the service worker — which can't see localStorage — agrees
 * with us and you never get the same nudge twice.
 */
export function useDailyNudge(): void {
  const { settings } = useSettings()
  const enabled = settings?.dailyNudge ?? false
  const at = settings?.dailyNudgeAt ?? '09:00'
  // Guards against a second notification within one run.
  const firedThisRun = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    void enableBackgroundNudge()

    let cancelled = false

    async function check() {
      const now = new Date()
      const todayKey = localDateKey(now.getTime())
      if (firedThisRun.current === todayKey) return

      const [segments, tasks, running, current] = await Promise.all([
        db.segments.toArray(),
        db.tasks.filter((t) => t.status === 'open').toArray(),
        db.sessions.filter((s) => s.status === 'running' || s.status === 'paused').count(),
        db.settings.get('app'),
      ])
      if (cancelled || !current) return

      const awake = tasks.filter((t) => !(t.hiddenUntil && t.hiddenUntil > todayKey))
      const nudge = decideNudge({
        enabled: true,
        at,
        lastFiredOn: current.nudgeLastFiredOn ?? null,
        todayKey,
        minutesNow: now.getHours() * 60 + now.getMinutes(),
        sessionRunning: running > 0,
        focusedMsToday: todayFocusedMs(segments, now.getTime()),
        dueCount: awake.filter((t) => t.dueDate !== null && t.dueDate <= todayKey).length,
        inboxCount: awake.filter((t) => (t.listId ?? null) === null).length,
        openCount: awake.length,
      })
      if (!nudge || cancelled) return

      firedThisRun.current = todayKey
      await db.settings.update('app', { nudgeLastFiredOn: todayKey })
      void notify(nudge.title, { body: nudge.body, tag: 'lockin-daily-nudge' })
    }

    check()
    const id = setInterval(check, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, at])
}

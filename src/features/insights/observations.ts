import { localDateKey, weekdayOf } from '../../lib/date'
import { segmentMs } from '../../domain/timing'
import { focusedMsByDay } from './aggregations'
import { formatMinutes } from '../../lib/time'
import type { FocusSegment, FocusSession } from '../../domain/types'

/**
 * Small true things to say about your own focus.
 *
 * This replaces the streak counter. Streaks are a fixed schedule with a cliff
 * at the end: predictable (so weakly motivating), delayed, and when it breaks
 * people tend to abandon the whole thing rather than restart. For a brain whose
 * inconsistency is structural rather than a choice, that's a trap.
 *
 * Unpredictable observations are the opposite — dopamine responds to *uncertain*
 * reward, so a line you can't predict lands harder than a badge you can. And
 * because they're descriptions rather than scores, there's nothing to fail at.
 *
 * Two rules this file holds to:
 *   * **Never say anything untrue.** Each observation is only generated when
 *     its data actually supports it.
 *   * **Never shame.** No "you haven't focused since Tuesday". Absence is
 *     simply not commented on.
 */

export type ObservationKind = 'record' | 'pattern' | 'volume' | 'welcome'

export interface Observation {
  id: string
  text: string
  kind: ObservationKind
}

export interface ObservationInput {
  segments: FocusSegment[]
  sessions: FocusSession[]
  /** Now, so "today" and rolling windows are stable and testable. */
  nowTs: number
}

const DAY = 86400000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Rough part of the day a session began. Coarser than an hour, and honest. */
export function partOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  if (hour < 23) return 'evening'
  return 'night'
}

function mostCommon<T>(counts: Map<T, number>): { key: T; value: number; share: number } | null {
  let best: { key: T; value: number } | null = null
  let total = 0
  for (const [k, v] of counts) {
    total += v
    if (!best || v > best.value) best = { key: k, value: v }
  }
  if (!best || total === 0) return null
  return { ...best, share: best.value / total }
}

/**
 * Every observation that is currently true. Order is not significance —
 * the caller picks one.
 */
export function buildObservations(input: ObservationInput): Observation[] {
  const { segments, sessions, nowTs } = input
  const out: Observation[] = []
  const byDay = focusedMsByDay(segments)
  const todayKey = localDateKey(nowTs)

  const activeDays = [...byDay.entries()].filter(([, ms]) => ms > 0)
  const totalMs = activeDays.reduce((s, [, ms]) => s + ms, 0)

  // --- Nothing to draw on yet: say something warm and true, never nothing.
  if (activeDays.length === 0) {
    return [
      { id: 'welcome', text: 'Your first session is the one that starts all this.', kind: 'welcome' },
    ]
  }

  // --- Volume: the pile that never resets.
  if (totalMs >= 60 * 60000) {
    out.push({
      id: 'total',
      text: `${formatMinutes(totalMs / 60000)} focused since you started.`,
      kind: 'volume',
    })
  }

  // --- Rolling window: no cliff, repairs itself.
  const windowStart = nowTs - 30 * DAY
  const recentDays = activeDays.filter(([key]) => new Date(`${key}T12:00:00`).getTime() >= windowStart)
  if (recentDays.length >= 3) {
    out.push({
      id: 'rolling30',
      text: `You've focused on ${recentDays.length} of the last 30 days.`,
      kind: 'volume',
    })
  }

  // --- Records, framed as things achieved rather than things at risk.
  const finished = sessions.filter((s) => s.status === 'completed')
  const lengths = finished
    .map((s) => ({ s, ms: segments.filter((g) => g.sessionId === s.id).reduce((n, g) => n + segmentMs(g, nowTs), 0) }))
    .filter((x) => x.ms > 0)
    .sort((a, b) => b.ms - a.ms)

  if (lengths.length >= 3) {
    out.push({
      id: 'longest-session',
      text: `Your longest session so far was ${formatMinutes(lengths[0].ms / 60000)}.`,
      kind: 'record',
    })
    const avg = lengths.reduce((n, x) => n + x.ms, 0) / lengths.length
    out.push({
      id: 'avg-session',
      text: `Your sessions run about ${formatMinutes(avg / 60000)} on average.`,
      kind: 'pattern',
    })
  }

  const bestDay = activeDays.slice().sort((a, b) => b[1] - a[1])[0]
  if (bestDay && bestDay[1] >= 30 * 60000) {
    const isToday = bestDay[0] === todayKey
    out.push({
      id: 'best-day',
      text: isToday
        ? `Today is your best day yet — ${formatMinutes(bestDay[1] / 60000)}.`
        : `Your best day was ${formatMinutes(bestDay[1] / 60000)} of focus.`,
      kind: 'record',
    })
  }

  // --- Patterns: information you can act on, not a score.
  if (finished.length >= 5) {
    const parts = new Map<string, number>()
    const days = new Map<number, number>()
    for (const { s, ms } of lengths) {
      const p = partOfDay(new Date(s.startedAt).getHours())
      parts.set(p, (parts.get(p) ?? 0) + ms)
      const d = weekdayOf(s.startedAt)
      days.set(d, (days.get(d) ?? 0) + ms)
    }

    const topPart = mostCommon(parts)
    // Only claim a preference when there genuinely is one.
    if (topPart && topPart.share >= 0.4) {
      out.push({
        id: 'part-of-day',
        text: `${topPart.key[0].toUpperCase()}${topPart.key.slice(1)}s are when you focus most.`,
        kind: 'pattern',
      })
    }

    const topDay = mostCommon(days)
    if (topDay && topDay.share >= 0.25) {
      out.push({
        id: 'weekday',
        text: `${WEEKDAYS[topDay.key]}s tend to be your strongest day.`,
        kind: 'pattern',
      })
    }
  }

  // --- This week against your own best week, never against a target.
  const weeks = new Map<number, number>()
  for (const [key, ms] of activeDays) {
    const ts = new Date(`${key}T12:00:00`).getTime()
    weeks.set(Math.floor((nowTs - ts) / (7 * DAY)), (weeks.get(Math.floor((nowTs - ts) / (7 * DAY))) ?? 0) + ms)
  }
  const thisWeek = weeks.get(0) ?? 0
  const bestWeek = Math.max(...weeks.values())
  if (weeks.size >= 2 && thisWeek > 0) {
    if (thisWeek >= bestWeek) {
      out.push({ id: 'best-week', text: 'This is your strongest week so far.', kind: 'record' })
    } else if (bestWeek - thisWeek <= 45 * 60000) {
      out.push({
        id: 'near-best-week',
        text: `You're ${formatMinutes((bestWeek - thisWeek) / 60000)} off your best week.`,
        kind: 'record',
      })
    }
  }

  // --- Today, only ever as a fact.
  const todayMs = byDay.get(todayKey) ?? 0
  if (todayMs > 0) {
    out.push({ id: 'today', text: `${formatMinutes(todayMs / 60000)} focused today.`, kind: 'volume' })
  }

  // A day that produced no other observation still gets one.
  if (out.length === 0) {
    out.push({ id: 'keeping-on', text: 'Still here, still going. That counts.', kind: 'welcome' })
  }
  return out
}

/**
 * Choose one. `seed` lets the caller decide how often it changes — a value
 * that's stable for a visit keeps the line from flickering on every render.
 */
export function pickObservation(list: Observation[], seed: number): Observation | null {
  if (list.length === 0) return null
  const i = Math.abs(Math.floor(seed)) % list.length
  return list[i]
}

import { localDateKey, lastNDays, weekdayOf } from '../../lib/date'
import { segmentMs } from '../../domain/timing'
import type { FocusSegment, FocusSession, Task, Settings, Weekday } from '../../domain/types'

/**
 * Pure productivity aggregations. Everything is derived from completed
 * session segments and task completion timestamps, using the local calendar.
 */

/** Focused ms per local date key, from all (completed) session segments. */
export function focusedMsByDay(segments: FocusSegment[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const seg of segments) {
    if (seg.endedAt === null) continue
    const key = localDateKey(seg.startedAt)
    map.set(key, (map.get(key) ?? 0) + segmentMs(seg, seg.endedAt))
  }
  return map
}

/** Completed task count per local date key. */
export function completedByDay(tasks: Task[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of tasks) {
    if (t.status !== 'completed' || t.completedAt === null) continue
    const key = localDateKey(t.completedAt)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

export interface DayStat {
  dateKey: string
  focusedMs: number
  completed: number
}

/** Per-day stats for the last n days (oldest first). */
export function dailyStats(
  segments: FocusSegment[],
  tasks: Task[],
  days: number,
): DayStat[] {
  const focus = focusedMsByDay(segments)
  const done = completedByDay(tasks)
  return lastNDays(days).map((dateKey) => ({
    dateKey,
    focusedMs: focus.get(dateKey) ?? 0,
    completed: done.get(dateKey) ?? 0,
  }))
}

/** Focused ms per list id (plus 'inbox' bucket) over given segments+tasks. */
export function focusedMsByList(segments: FocusSegment[], tasks: Task[]): Map<string, number> {
  const taskList = new Map<string, string>()
  for (const t of tasks) taskList.set(t.id, t.listId ?? 'inbox')
  const map = new Map<string, number>()
  for (const seg of segments) {
    if (seg.endedAt === null || !seg.taskId) continue
    const bucket = taskList.get(seg.taskId) ?? 'inbox'
    map.set(bucket, (map.get(bucket) ?? 0) + segmentMs(seg, seg.endedAt))
  }
  return map
}

export function todayFocusedMs(segments: FocusSegment[]): number {
  return focusedMsByDay(segments).get(localDateKey()) ?? 0
}

/**
 * Current streak counting only eligible workdays. A workday counts as "met"
 * when focused time reaches the daily goal. Rest days never break the streak.
 * Today is only counted against the streak once its goal is met (so an
 * in-progress day doesn't show as a break).
 */
export function currentStreak(
  segments: FocusSegment[],
  settings: Settings,
  from: number = Date.now(),
): number {
  const focus = focusedMsByDay(segments)
  const goalMs = settings.dailyGoalMinutes * 60000
  const workdays = new Set<Weekday>(settings.workdays)
  const todayKey = localDateKey(from)

  let streak = 0
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)

  // Walk backwards day by day.
  for (let i = 0; i < 3650; i++) {
    const ts = cursor.getTime()
    const key = localDateKey(ts)
    const isWorkday = workdays.has(weekdayOf(ts) as Weekday)
    if (isWorkday) {
      const met = (focus.get(key) ?? 0) >= goalMs
      if (met) {
        streak++
      } else if (key === todayKey) {
        // Today's goal not yet met: don't break the streak, just skip it.
      } else {
        break
      }
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export interface WeekComparison {
  thisWeekMs: number
  lastWeekMs: number
  deltaMs: number
}

export function weekComparison(segments: FocusSegment[]): WeekComparison {
  const stats = dailyStats(segments, [], 14)
  const lastWeekMs = stats.slice(0, 7).reduce((s, d) => s + d.focusedMs, 0)
  const thisWeekMs = stats.slice(7).reduce((s, d) => s + d.focusedMs, 0)
  return { thisWeekMs, lastWeekMs, deltaMs: thisWeekMs - lastWeekMs }
}

export interface SessionSummary {
  session: FocusSession
  focusedMs: number
}

export function summarizeSessions(
  sessions: FocusSession[],
  segments: FocusSegment[],
): SessionSummary[] {
  const bySession = new Map<string, number>()
  for (const seg of segments) {
    if (seg.endedAt === null) continue
    bySession.set(seg.sessionId, (bySession.get(seg.sessionId) ?? 0) + segmentMs(seg, seg.endedAt))
  }
  return sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((session) => ({ session, focusedMs: bySession.get(session.id) ?? 0 }))
}

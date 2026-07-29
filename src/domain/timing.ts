import type { FocusSegment, FocusSession } from './types'

/**
 * Pure timing math for focus sessions. All durations are derived from
 * wall-clock timestamps on segments, never from tick counters, so pauses,
 * refreshes, and tab suspension can never corrupt the total.
 */

export function segmentMs(seg: FocusSegment, nowTs: number): number {
  const end = seg.endedAt ?? nowTs
  return Math.max(0, end - seg.startedAt)
}

/** Total active (non-paused) focused time for a set of segments. */
export function activeMs(segments: FocusSegment[], nowTs: number = Date.now()): number {
  return segments.reduce((sum, s) => sum + segmentMs(s, nowTs), 0)
}

/** Active focused time attributed to a specific task. */
export function activeMsForTask(
  segments: FocusSegment[],
  taskId: string,
  nowTs: number = Date.now(),
): number {
  return segments
    .filter((s) => s.taskId === taskId)
    .reduce((sum, s) => sum + segmentMs(s, nowTs), 0)
}

/** ms remaining until the session's minimum; 0 once reached. */
export function remainingMs(
  session: FocusSession,
  segments: FocusSegment[],
  nowTs: number = Date.now(),
): number {
  const target = session.minMinutes * 60000
  return Math.max(0, target - activeMs(segments, nowTs))
}

export function isOvertime(
  session: FocusSession,
  segments: FocusSegment[],
  nowTs: number = Date.now(),
): boolean {
  return activeMs(segments, nowTs) >= session.minMinutes * 60000
}

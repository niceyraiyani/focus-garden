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

/** How long we tolerate silence before assuming the app was closed. */
export const PRESENCE_GRACE_MS = 90_000

/**
 * A focus session only counts while you're actually there. If the app is
 * closed or the device sleeps, the heartbeat stops but the open segment would
 * otherwise keep accruing — turning a 40 minute session into "10h".
 *
 * Returns the timestamp the session should be closed at (the last moment we
 * know the user was present), or null if the session is still live.
 */
export function abandonedEndAt(
  session: FocusSession,
  segments: FocusSegment[],
  nowTs: number = Date.now(),
  graceMs: number = PRESENCE_GRACE_MS,
): number | null {
  if (session.status !== 'running') return null
  const open = segments.filter((s) => s.sessionId === session.id && s.endedAt === null)
  if (open.length === 0) return null

  // Fall back through progressively older signals so sessions created before
  // heartbeats existed still get closed at a sensible time.
  const lastSeen = Math.max(
    session.lastActiveAt ?? 0,
    session.updatedAt,
    session.startedAt,
    ...open.map((s) => s.startedAt),
  )
  return nowTs - lastSeen > graceMs ? lastSeen : null
}

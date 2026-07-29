import { describe, it, expect } from 'vitest'
import { segmentMs, activeMs, activeMsForTask, remainingMs, isOvertime, abandonedEndAt } from './timing'
import type { FocusSegment, FocusSession } from './types'

function seg(start: number, end: number | null, taskId: string | null = null): FocusSegment {
  return { id: `s${start}`, sessionId: 'x', taskId, startedAt: start, endedAt: end }
}

const session = (min: number): FocusSession => ({
  id: 'x',
  status: 'running',
  queue: [],
  activeTaskId: null,
  parkingLot: [],
  minMinutes: min,
  startedAt: 0,
  endedAt: null,
  notifiedMinReached: false,
  createdAt: 0,
  updatedAt: 0,
})

describe('timing', () => {
  it('measures a closed segment by its timestamps', () => {
    expect(segmentMs(seg(1000, 4000), 9999)).toBe(3000)
  })

  it('measures an open segment up to now', () => {
    expect(segmentMs(seg(1000, null), 5000)).toBe(4000)
  })

  it('excludes paused gaps from active time', () => {
    // worked 0-1s, paused 1-2s, worked 2-3s => 2s active, not 3s wall
    const segs = [seg(0, 1000), seg(2000, 3000)]
    expect(activeMs(segs, 3000)).toBe(2000)
  })

  it('attributes time per task', () => {
    const segs = [seg(0, 1000, 'a'), seg(1000, 3000, 'b'), seg(3000, 4000, 'a')]
    expect(activeMsForTask(segs, 'a', 9999)).toBe(2000)
    expect(activeMsForTask(segs, 'b', 9999)).toBe(2000)
  })

  it('computes remaining and overtime against the minimum', () => {
    const s = session(1) // 60_000 ms
    const segs = [seg(0, 30000)]
    expect(remainingMs(s, segs, 30000)).toBe(30000)
    expect(isOvertime(s, segs, 30000)).toBe(false)

    const segs2 = [seg(0, 65000)]
    expect(remainingMs(s, segs2, 65000)).toBe(0)
    expect(isOvertime(s, segs2, 65000)).toBe(true)
  })
})

describe('abandonedEndAt', () => {
  const GRACE = 90_000
  const running = (patch: Partial<FocusSession> = {}): FocusSession => ({
    ...session(30),
    startedAt: 1_000_000,
    updatedAt: 1_000_000,
    ...patch,
  })

  it('leaves a session alone while the heartbeat is fresh', () => {
    const s = running({ lastActiveAt: 1_100_000 })
    const segs = [seg(1_000_000, null)]
    expect(abandonedEndAt(s, segs, 1_130_000, GRACE)).toBeNull()
  })

  it('closes the session at the last heartbeat once the app goes quiet', () => {
    const s = running({ lastActiveAt: 1_100_000 })
    const segs = [seg(1_000_000, null)]
    // Reopened 10 hours later: the session ends when we last saw them.
    expect(abandonedEndAt(s, segs, 1_100_000 + 36_000_000, GRACE)).toBe(1_100_000)
  })

  it('ignores sessions with no open segment', () => {
    const s = running({ lastActiveAt: 1_100_000 })
    expect(abandonedEndAt(s, [seg(1_000_000, 1_050_000)], 9_000_000, GRACE)).toBeNull()
  })

  it('ignores paused sessions', () => {
    const s = running({ status: 'paused', lastActiveAt: 1_100_000 })
    expect(abandonedEndAt(s, [seg(1_000_000, null)], 9_000_000, GRACE)).toBeNull()
  })

  it('falls back to updatedAt for sessions saved before heartbeats existed', () => {
    const s = running({ updatedAt: 1_200_000 })
    expect(abandonedEndAt(s, [seg(1_000_000, null)], 9_000_000, GRACE)).toBe(1_200_000)
  })

  it('never ends a session before its open segment started', () => {
    const s = running({ updatedAt: 0, lastActiveAt: 0 })
    const segs = [seg(1_500_000, null)]
    expect(abandonedEndAt(s, segs, 9_000_000, GRACE)).toBe(1_500_000)
  })
})

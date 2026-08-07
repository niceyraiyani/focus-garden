import { describe, it, expect } from 'vitest'
import { buildObservations, pickObservation, partOfDay } from './observations'
import type { FocusSegment, FocusSession } from '../../domain/types'

const DAY = 86400000
const NOW = new Date('2026-08-07T15:00:00').getTime()

function session(id: string, startedAt: number, minutes: number): FocusSession {
  return {
    id,
    status: 'completed',
    queue: [],
    activeTaskId: null,
    parkingLot: [],
    completedTaskIds: [],
    minMinutes: 30,
    startedAt,
    endedAt: startedAt + minutes * 60000,
    lastActiveAt: startedAt + minutes * 60000,
    notifiedMinReached: true,
    createdAt: startedAt,
    updatedAt: startedAt,
  }
}

function segment(id: string, sessionId: string, startedAt: number, minutes: number): FocusSegment {
  return { id, sessionId, taskId: null, startedAt, endedAt: startedAt + minutes * 60000 }
}

/** n sessions of `minutes`, one per day going back from `NOW`. */
function history(n: number, minutes: number, hour = 10) {
  const sessions: FocusSession[] = []
  const segments: FocusSegment[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(NOW - i * DAY)
    d.setHours(hour, 0, 0, 0)
    const t = d.getTime()
    sessions.push(session(`s${i}`, t, minutes))
    segments.push(segment(`g${i}`, `s${i}`, t, minutes))
  }
  return { sessions, segments }
}

describe('observations', () => {
  it('always says something, even with no history at all', () => {
    const obs = buildObservations({ segments: [], sessions: [], nowTs: NOW })
    expect(obs.length).toBeGreaterThan(0)
    expect(pickObservation(obs, 0)).not.toBeNull()
  })

  it('never shames an empty day', () => {
    const obs = buildObservations({ segments: [], sessions: [], nowTs: NOW })
    const text = obs.map((o) => o.text).join(' ').toLowerCase()
    for (const bad of ['streak', "haven't", 'missed', 'failed', 'behind', 'no focus']) {
      expect(text).not.toContain(bad)
    }
  })

  it('reports the running total once there is an hour of it', () => {
    const { sessions, segments } = history(4, 45)
    const obs = buildObservations({ segments, sessions, nowTs: NOW })
    expect(obs.find((o) => o.id === 'total')?.text).toMatch(/focused since you started/)
  })

  it('counts active days in a rolling window rather than consecutively', () => {
    // Deliberately gappy: a streak would read 1, this should read 5.
    const sessions: FocusSession[] = []
    const segments: FocusSegment[] = []
    for (const offset of [0, 3, 7, 12, 20]) {
      const d = new Date(NOW - offset * DAY)
      d.setHours(10, 0, 0, 0)
      sessions.push(session(`s${offset}`, d.getTime(), 40))
      segments.push(segment(`g${offset}`, `s${offset}`, d.getTime(), 40))
    }
    const obs = buildObservations({ segments, sessions, nowTs: NOW })
    expect(obs.find((o) => o.id === 'rolling30')?.text).toBe(
      "You've focused on 5 of the last 30 days.",
    )
  })

  it('only claims a time-of-day preference when one really exists', () => {
    const morning = history(6, 50, 9)
    const obs = buildObservations({ ...morning, nowTs: NOW })
    expect(obs.find((o) => o.id === 'part-of-day')?.text).toMatch(/Mornings/)

    // Too little history to generalise from.
    const thin = history(2, 50, 9)
    const thinObs = buildObservations({ ...thin, nowTs: NOW })
    expect(thinObs.find((o) => o.id === 'part-of-day')).toBeUndefined()
  })

  it('calls out a personal best day, and knows when it is today', () => {
    const { sessions, segments } = history(3, 40)
    const d = new Date(NOW)
    d.setHours(9, 0, 0, 0)
    sessions.push(session('big', d.getTime(), 120))
    segments.push(segment('gbig', 'big', d.getTime(), 120))
    const obs = buildObservations({ segments, sessions, nowTs: NOW })
    expect(obs.find((o) => o.id === 'best-day')?.text).toMatch(/Today is your best day yet/)
  })

  it('reports session length stats only with enough sessions to mean anything', () => {
    const thin = history(2, 30)
    expect(buildObservations({ ...thin, nowTs: NOW }).find((o) => o.id === 'avg-session')).toBeUndefined()

    const enough = history(5, 30)
    expect(buildObservations({ ...enough, nowTs: NOW }).find((o) => o.id === 'avg-session')).toBeDefined()
  })

  it('picks deterministically from a seed and stays in range', () => {
    const { sessions, segments } = history(8, 45)
    const obs = buildObservations({ segments, sessions, nowTs: NOW })
    expect(pickObservation(obs, 3)).toBe(pickObservation(obs, 3))
    for (const seed of [0, 1, 7, 99, 12345]) {
      expect(obs).toContain(pickObservation(obs, seed))
    }
  })

  it('offers genuine variety so it does not feel like one repeated line', () => {
    const { sessions, segments } = history(10, 55)
    const obs = buildObservations({ segments, sessions, nowTs: NOW })
    expect(obs.length).toBeGreaterThanOrEqual(4)
    expect(new Set(obs.map((o) => o.kind)).size).toBeGreaterThanOrEqual(2)
  })
})

describe('partOfDay', () => {
  it('buckets the clock the way people talk about it', () => {
    expect(partOfDay(2)).toBe('night')
    expect(partOfDay(9)).toBe('morning')
    expect(partOfDay(14)).toBe('afternoon')
    expect(partOfDay(20)).toBe('evening')
    expect(partOfDay(23)).toBe('night')
  })
})

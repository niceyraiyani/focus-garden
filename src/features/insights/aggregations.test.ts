import { describe, it, expect } from 'vitest'
import {
  focusedMsByDay,
  completedByDay,
  currentStreak,
  weekComparison,
  focusHeatmap,
} from './aggregations'
import type { FocusSegment, Task, Settings } from '../../domain/types'

function daySeg(y: number, m: number, d: number, mins: number): FocusSegment {
  const start = new Date(y, m, d, 10, 0, 0, 0).getTime()
  return { id: `${y}-${m}-${d}-${mins}`, sessionId: 'x', taskId: null, startedAt: start, endedAt: start + mins * 60000 }
}

const settings: Settings = {
  id: 'app',
  theme: 'system',
  accent: 'white',
  vibe: 'flowers',
  retro: true,
  defaultMinMinutes: 30,
  notificationsEnabled: false,
  dailyNudge: false,
  dailyNudgeAt: '09:00',
  workdays: [1, 2, 3, 4, 5],
  dailyGoalMinutes: 60,
  decorativeMotion: true,
  celebrations: true,
  blocklist: [],
  version: 1,
}

describe('focusedMsByDay', () => {
  it('sums closed segments per local day and skips open ones', () => {
    const map = focusedMsByDay([
      daySeg(2026, 0, 5, 30),
      daySeg(2026, 0, 5, 15),
      { id: 'open', sessionId: 'x', taskId: null, startedAt: new Date(2026, 0, 5, 9).getTime(), endedAt: null },
    ])
    expect(map.get('2026-01-05')).toBe(45 * 60000)
  })
})

describe('completedByDay', () => {
  it('counts completed tasks per local completion day', () => {
    const t = (id: string, done: number | null): Task => ({
      id,
      title: id,
      notes: '',
      status: done ? 'completed' : 'open',
      listId: null,
      tagIds: [],
      dueDate: null,
      priority: 'none',
      effort: 0,
      sortRank: 0,
      createdAt: 0,
      updatedAt: 0,
      completedAt: done,
      originSessionId: null,
    })
    const map = completedByDay([t('a', new Date(2026, 0, 5, 12).getTime()), t('b', null)])
    expect(map.get('2026-01-05')).toBe(1)
  })
})

describe('currentStreak', () => {
  it('counts consecutive met workdays and skips rest days without breaking', () => {
    // Jan 2026: 1=Thu, 2=Fri, 3=Sat, 4=Sun, 5=Mon, 6=Tue, 7=Wed
    const from = new Date(2026, 0, 7, 12).getTime()
    const segs = [
      daySeg(2026, 0, 7, 60),
      daySeg(2026, 0, 6, 60),
      daySeg(2026, 0, 5, 60),
      daySeg(2026, 0, 2, 60), // Friday before the weekend
      // Jan 1 (Thu) intentionally unmet -> ends the streak
    ]
    expect(currentStreak(segs, settings, from)).toBe(4)
  })

  it('does not break the streak when today has not met the goal yet', () => {
    const from = new Date(2026, 0, 7, 12).getTime()
    const segs = [daySeg(2026, 0, 6, 60), daySeg(2026, 0, 5, 60)] // nothing today
    expect(currentStreak(segs, settings, from)).toBe(2)
  })

  it('breaks on a missed past workday', () => {
    const from = new Date(2026, 0, 7, 12).getTime()
    const segs = [daySeg(2026, 0, 7, 60), daySeg(2026, 0, 5, 60)] // Tue Jan 6 missed
    expect(currentStreak(segs, settings, from)).toBe(1)
  })
})

describe('weekComparison', () => {
  it('compares the most recent 7 days against the prior 7', () => {
    const now = Date.now()
    const today = new Date(now)
    today.setHours(10, 0, 0, 0)
    const eightAgo = new Date(today)
    eightAgo.setDate(eightAgo.getDate() - 8)
    const segs: FocusSegment[] = [
      { id: 't', sessionId: 'x', taskId: null, startedAt: today.getTime(), endedAt: today.getTime() + 60 * 60000 },
      { id: 'l', sessionId: 'x', taskId: null, startedAt: eightAgo.getTime(), endedAt: eightAgo.getTime() + 30 * 60000 },
    ]
    const cmp = weekComparison(segs)
    expect(cmp.thisWeekMs).toBe(60 * 60000)
    expect(cmp.lastWeekMs).toBe(30 * 60000)
    expect(cmp.deltaMs).toBe(30 * 60000)
  })
})

describe('focusHeatmap', () => {
  // A Thursday, so the trailing week is partially in the future.
  const now = new Date(2026, 6, 30, 15, 0, 0).getTime()

  it('lays out whole Sunday-first weeks', () => {
    const h = focusHeatmap([], settings, now, 5)
    expect(h.weeks).toHaveLength(5)
    for (const w of h.weeks) expect(w.cells).toHaveLength(7)
    // Every row starts on a Sunday.
    for (const w of h.weeks) {
      expect(new Date(w.cells[0].dateKey + 'T12:00').getDay()).toBe(0)
    }
  })

  it('ends on the week containing today', () => {
    const h = focusHeatmap([], settings, now, 4)
    const last = h.weeks[h.weeks.length - 1]
    expect(last.cells.map((c) => c.dateKey)).toContain('2026-07-30')
  })

  it('scales levels against the daily goal', () => {
    // goal is 60 min in the shared settings
    const h = focusHeatmap(
      [
        daySeg(2026, 6, 27, 10), // 17% -> 1
        daySeg(2026, 6, 28, 20), // 33% -> 2
        daySeg(2026, 6, 29, 40), // 67% -> 3
        daySeg(2026, 6, 30, 90), // over goal -> 4
      ],
      settings,
      now,
      3,
    )
    const byKey = new Map(h.weeks.flatMap((w) => w.cells).map((c) => [c.dateKey, c]))
    expect(byKey.get('2026-07-27')?.level).toBe(1)
    expect(byKey.get('2026-07-28')?.level).toBe(2)
    expect(byKey.get('2026-07-29')?.level).toBe(3)
    expect(byKey.get('2026-07-30')?.level).toBe(4)
    expect(byKey.get('2026-07-26')?.level).toBe(0)
  })

  it('ignores days that have not happened yet', () => {
    const h = focusHeatmap([daySeg(2026, 6, 30, 30)], settings, now, 2)
    const future = h.weeks[h.weeks.length - 1].cells.find((c) => c.dateKey === '2026-07-31')
    expect(future?.level).toBe(0)
    // Only the one real day counts.
    expect(h.activeDays).toBe(1)
    expect(h.totalMs).toBe(30 * 60000)
  })

  it('reports the longest consecutive run of focused days', () => {
    const h = focusHeatmap(
      [daySeg(2026, 6, 27, 20), daySeg(2026, 6, 28, 20), daySeg(2026, 6, 30, 20)],
      settings,
      now,
      3,
    )
    expect(h.bestRun).toBe(2)
  })

  it('labels the first week of each month once', () => {
    const h = focusHeatmap([], settings, now, 10)
    const labels = h.weeks.map((w) => w.monthLabel).filter(Boolean)
    expect(labels.length).toBeGreaterThan(0)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('focusedMsByDay across midnight', () => {
  const at = (y: number, m: number, d: number, h: number, min = 0) =>
    new Date(y, m, d, h, min, 0, 0).getTime()

  it('splits a segment at the local day boundary', () => {
    // 23:40 -> 00:20 = 40 min, split 20/20 across the two days.
    const seg = {
      id: 'x', sessionId: 's', taskId: null,
      startedAt: at(2026, 0, 5, 23, 40),
      endedAt: at(2026, 0, 6, 0, 20),
    }
    const map = focusedMsByDay([seg])
    expect(map.get('2026-01-05')).toBe(20 * 60000)
    expect(map.get('2026-01-06')).toBe(20 * 60000)
  })

  it('keeps the total intact when splitting', () => {
    const seg = {
      id: 'x', sessionId: 's', taskId: null,
      startedAt: at(2026, 0, 5, 22, 0),
      endedAt: at(2026, 0, 6, 3, 0),
    }
    const map = focusedMsByDay([seg])
    const total = [...map.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(5 * 3600000)
  })

  it('spans more than two days', () => {
    const seg = {
      id: 'x', sessionId: 's', taskId: null,
      startedAt: at(2026, 0, 5, 12, 0),
      endedAt: at(2026, 0, 7, 12, 0),
    }
    const map = focusedMsByDay([seg])
    expect(map.get('2026-01-05')).toBe(12 * 3600000)
    expect(map.get('2026-01-06')).toBe(24 * 3600000)
    expect(map.get('2026-01-07')).toBe(12 * 3600000)
  })

  it('leaves a same-day segment on its own day', () => {
    const map = focusedMsByDay([daySeg(2026, 0, 5, 45)])
    expect(map.get('2026-01-05')).toBe(45 * 60000)
    expect(map.size).toBe(1)
  })

  it('splits an open segment measured up to now', () => {
    const map = focusedMsByDay(
      [{ id: 'o', sessionId: 's', taskId: null, startedAt: at(2026, 0, 5, 23, 30), endedAt: null }],
      at(2026, 0, 6, 0, 30),
    )
    expect(map.get('2026-01-05')).toBe(30 * 60000)
    expect(map.get('2026-01-06')).toBe(30 * 60000)
  })

  it('ignores a segment whose end precedes its start', () => {
    const map = focusedMsByDay([
      { id: 'b', sessionId: 's', taskId: null, startedAt: at(2026, 0, 5, 10), endedAt: at(2026, 0, 5, 9) },
    ])
    expect(map.size).toBe(0)
  })
})

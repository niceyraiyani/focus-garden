import { describe, it, expect } from 'vitest'
import {
  focusedMsByDay,
  completedByDay,
  currentStreak,
  weekComparison,
} from './aggregations'
import type { FocusSegment, Task, Settings } from '../../domain/types'

function daySeg(y: number, m: number, d: number, mins: number): FocusSegment {
  const start = new Date(y, m, d, 10, 0, 0, 0).getTime()
  return { id: `${y}-${m}-${d}-${mins}`, sessionId: 'x', taskId: null, startedAt: start, endedAt: start + mins * 60000 }
}

const settings: Settings = {
  id: 'app',
  theme: 'system',
  accent: 'terracotta',
  defaultMinMinutes: 30,
  notificationsEnabled: false,
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

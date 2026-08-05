import { describe, it, expect } from 'vitest'
import { nextDueDate } from './recurrence'

describe('nextDueDate', () => {
  it('returns null when the task does not repeat', () => {
    expect(nextDueDate('2025-06-10', 'none', '2025-06-10')).toBeNull()
    expect(nextDueDate('2025-06-10', undefined, '2025-06-10')).toBeNull()
  })

  it('advances one day, week, or month from the completed occurrence', () => {
    expect(nextDueDate('2025-06-10', 'daily', '2025-06-10')).toBe('2025-06-11')
    expect(nextDueDate('2025-06-10', 'weekly', '2025-06-10')).toBe('2025-06-17')
    expect(nextDueDate('2025-06-10', 'monthly', '2025-06-10')).toBe('2025-07-10')
  })

  it('skips weekends for weekday tasks', () => {
    // 2025-06-13 is a Friday.
    expect(nextDueDate('2025-06-13', 'weekdays', '2025-06-13')).toBe('2025-06-16')
    // Saturday rolls to Monday too.
    expect(nextDueDate('2025-06-14', 'weekdays', '2025-06-14')).toBe('2025-06-16')
  })

  it('skips missed occurrences instead of stacking them up', () => {
    // Weekly chore last due three weeks ago, finished today.
    expect(nextDueDate('2025-06-01', 'weekly', '2025-06-20')).toBe('2025-06-22')
    // A daily task abandoned for a month gives one instance, not thirty.
    expect(nextDueDate('2025-05-01', 'daily', '2025-06-20')).toBe('2025-06-21')
  })

  it('always lands strictly after today, never on it', () => {
    // Completing a daily task early shouldn't put another one on today.
    expect(nextDueDate('2025-06-19', 'daily', '2025-06-20')).toBe('2025-06-21')
    expect(nextDueDate('2025-06-20', 'daily', '2025-06-20')).toBe('2025-06-21')
  })

  it('clamps monthly tasks to the last day of shorter months', () => {
    expect(nextDueDate('2025-01-31', 'monthly', '2025-01-31')).toBe('2025-02-28')
    expect(nextDueDate('2024-01-31', 'monthly', '2024-01-31')).toBe('2024-02-29')
    expect(nextDueDate('2025-03-31', 'monthly', '2025-03-31')).toBe('2025-04-30')
  })

  it('does not drift: a clamped month restores the original day next time', () => {
    // Once clamped to the 28th, monthly should stay on the 28th. This is a
    // known tradeoff -- documented rather than silently surprising.
    const feb = nextDueDate('2025-01-31', 'monthly', '2025-01-31')!
    expect(nextDueDate(feb, 'monthly', feb)).toBe('2025-03-28')
  })

  it('ignores malformed or impossible dates', () => {
    expect(nextDueDate('not-a-date', 'daily', '2025-06-20')).toBeNull()
    expect(nextDueDate('2025-02-31', 'daily', '2025-06-20')).toBeNull()
  })

  it('crosses year boundaries', () => {
    expect(nextDueDate('2025-12-31', 'daily', '2025-12-31')).toBe('2026-01-01')
    expect(nextDueDate('2025-12-15', 'monthly', '2025-12-15')).toBe('2026-01-15')
  })
})

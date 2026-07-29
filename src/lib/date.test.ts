import { describe, it, expect } from 'vitest'
import { monthMatrix, weekDates, monthOfKey, dayOfKey } from './date'

const day = (k: string) => new Date(`${k}T12:00`).getDay()

describe('calendar date helpers', () => {
  it('monthMatrix returns 42 keys starting on a Sunday and covers the month', () => {
    const ts = new Date(2026, 0, 15, 12).getTime() // January 2026
    const m = monthMatrix(ts)
    expect(m).toHaveLength(42)
    expect(day(m[0])).toBe(0) // starts Sunday
    expect(m).toContain('2026-01-01')
    expect(m).toContain('2026-01-31')
  })

  it('weekDates returns 7 keys from Sunday to Saturday around the date', () => {
    const ts = new Date(2026, 0, 15, 12).getTime() // Thursday
    const w = weekDates(ts)
    expect(w).toHaveLength(7)
    expect(day(w[0])).toBe(0)
    expect(day(w[6])).toBe(6)
    expect(w).toContain('2026-01-15')
  })

  it('monthOfKey and dayOfKey parse a date key', () => {
    expect(monthOfKey('2026-03-09')).toBe(2)
    expect(dayOfKey('2026-03-09')).toBe(9)
  })
})

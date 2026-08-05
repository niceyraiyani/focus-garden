import { describe, it, expect } from 'vitest'
import { decideNudge, parseTimeOfDay } from './nudge'
import type { NudgeInputs } from './nudge'

const base: NudgeInputs = {
  enabled: true,
  at: '09:00',
  lastFiredOn: null,
  todayKey: '2026-08-05',
  minutesNow: 9 * 60,
  sessionRunning: false,
  focusedMsToday: 0,
  dueCount: 2,
  inboxCount: 1,
  openCount: 5,
}
const at = (patch: Partial<NudgeInputs>) => decideNudge({ ...base, ...patch })

describe('parseTimeOfDay', () => {
  it('parses valid times', () => {
    expect(parseTimeOfDay('09:00')).toBe(540)
    expect(parseTimeOfDay('00:00')).toBe(0)
    expect(parseTimeOfDay('23:59')).toBe(1439)
    expect(parseTimeOfDay('7:05')).toBe(425)
  })

  it('rejects malformed or out-of-range values', () => {
    for (const bad of ['', 'nine', '24:00', '12:60', '-1:00', '12', '12:5']) {
      expect(parseTimeOfDay(bad)).toBeNull()
    }
  })
})

describe('decideNudge', () => {
  it('fires once the chosen time has passed', () => {
    expect(at({})).not.toBeNull()
  })

  it('stays quiet before the chosen time', () => {
    expect(at({ minutesNow: 8 * 60 + 59 })).toBeNull()
  })

  it('stays quiet when switched off', () => {
    expect(at({ enabled: false })).toBeNull()
  })

  it('only fires once a day', () => {
    expect(at({ lastFiredOn: '2026-08-05' })).toBeNull()
    // A new day re-arms it.
    expect(at({ lastFiredOn: '2026-08-04' })).not.toBeNull()
  })

  it('does not interrupt a running session', () => {
    expect(at({ sessionRunning: true })).toBeNull()
  })

  it('stays quiet once you have already focused today', () => {
    expect(at({ focusedMsToday: 60_000 })).toBeNull()
  })

  it('stays quiet when there is genuinely nothing to do', () => {
    expect(at({ dueCount: 0, inboxCount: 0, openCount: 0 })).toBeNull()
  })

  it('leads with what is due', () => {
    expect(at({ dueCount: 3 })?.title).toBe('3 due today')
  })

  it('falls back to the inbox when nothing is due', () => {
    const n = at({ dueCount: 0, inboxCount: 2 })
    expect(n?.title).toBe('Time to lock in')
    expect(n?.body).toContain('2 thoughts')
  })

  it('uses singular wording for one inbox item', () => {
    expect(at({ dueCount: 0, inboxCount: 1 })?.body).toContain('1 thought is')
  })

  it('still nudges when only undated work exists', () => {
    expect(at({ dueCount: 0, inboxCount: 0, openCount: 4 })).not.toBeNull()
  })

  it('ignores a malformed time rather than firing at midnight', () => {
    expect(at({ at: 'oops' })).toBeNull()
  })
})

/**
 * Decides whether the daily nudge should fire, and what it should say.
 *
 * Pure so the rules can be tested without clocks, notifications or a database.
 * The rules exist to make the nudge feel like a friend rather than an alarm:
 * it arrives once, only when it has something useful to say, and never while
 * you're already working.
 */

export interface NudgeInputs {
  enabled: boolean
  /** "HH:MM" local time the user chose. */
  at: string
  /** Local date key (yyyy-mm-dd) the nudge last fired on, or null. */
  lastFiredOn: string | null
  /** Now, as a local date key and minutes-since-midnight. */
  todayKey: string
  minutesNow: number
  /** Whether a focus session is currently running. */
  sessionRunning: boolean
  /** Focused milliseconds so far today. */
  focusedMsToday: number
  /** Open tasks due today or earlier. */
  dueCount: number
  /** Open tasks with no list and no date. */
  inboxCount: number
  /** Open tasks overall. */
  openCount: number
}

export interface Nudge {
  title: string
  body: string
}

/** Parse "HH:MM" into minutes since midnight, or null if malformed. */
export function parseTimeOfDay(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

export function decideNudge(input: NudgeInputs): Nudge | null {
  if (!input.enabled) return null

  const target = parseTimeOfDay(input.at)
  if (target === null) return null

  // Once a day, and only after the chosen time.
  if (input.lastFiredOn === input.todayKey) return null
  if (input.minutesNow < target) return null

  // You're already working, or already did. Nothing to nudge about.
  if (input.sessionRunning) return null
  if (input.focusedMsToday > 0) return null

  // Nothing to point at — staying quiet beats a notification that says
  // "you have nothing to do".
  if (input.dueCount === 0 && input.inboxCount === 0 && input.openCount === 0) return null

  if (input.dueCount > 0) {
    return {
      title: `${input.dueCount} due today`,
      body: 'Pick one and lock in — even fifteen minutes counts.',
    }
  }
  if (input.inboxCount > 0) {
    return {
      title: 'Time to lock in',
      body: `${input.inboxCount} ${input.inboxCount === 1 ? 'thought is' : 'thoughts are'} waiting in your Inbox.`,
    }
  }
  return {
    title: 'Time to lock in',
    body: 'Nothing is due, so pick whatever you feel like starting.',
  }
}

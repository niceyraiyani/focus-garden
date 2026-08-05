import type { Repeat } from './types'

/**
 * Works out when a repeating task should next appear.
 *
 * The important decision here is **skip, don't catch up**. If a weekly task was
 * due three weeks ago and you complete it today, you get *one* instance next
 * week — not three overdue copies. Catch-up scheduling is how a repeating task
 * turns into a wall of red, which is the exact thing this app exists to avoid.
 *
 * Pure and date-string based (yyyy-mm-dd) so it can be tested without clocks.
 */

function parse(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  // Rejects things like 2025-02-31, which Date would silently roll over.
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null
  return d
}

function format(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Advance one step of the cadence, ignoring whether the result is in the past. */
function step(d: Date, repeat: Repeat): Date {
  const next = new Date(d)
  switch (repeat) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      return next
    case 'weekdays':
      do {
        next.setDate(next.getDate() + 1)
      } while (next.getDay() === 0 || next.getDay() === 6)
      return next
    case 'weekly':
      next.setDate(next.getDate() + 7)
      return next
    case 'monthly': {
      const day = next.getDate()
      next.setDate(1)
      next.setMonth(next.getMonth() + 1)
      // "The 31st" in a 30-day month lands on the last day of that month
      // rather than skidding into the next one.
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(day, lastDay))
      return next
    }
    default:
      return next
  }
}

/**
 * The next due date for a repeating task, or null if it doesn't repeat.
 *
 * @param from  The occurrence being completed (yyyy-mm-dd).
 * @param today Today's date key; the result is always strictly after this, so
 *              finishing a long-overdue chore doesn't immediately produce
 *              another overdue one.
 */
export function nextDueDate(from: string, repeat: Repeat | undefined, today: string): string | null {
  if (!repeat || repeat === 'none') return null
  const start = parse(from)
  if (!start) return null

  let next = step(start, repeat)
  // Skip every occurrence that's already been and gone.
  let guard = 0
  while (format(next) <= today && guard < 500) {
    next = step(next, repeat)
    guard++
  }
  return format(next)
}

/**
 * Whether a task is sleeping — scheduled, but deliberately out of sight until
 * its day comes round.
 *
 * This is what makes repeating tasks bearable: ticking one off empties the
 * list. Nothing reappears with a shiny new deadline the instant you finish it.
 */
export function isSleeping(task: { hiddenUntil?: string | null }, today: string): boolean {
  return !!task.hiddenUntil && task.hiddenUntil > today
}

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekdays: 'Every weekday',
  weekly: 'Every week',
  monthly: 'Every month',
}

export const REPEAT_SHORT: Record<Repeat, string> = {
  none: '',
  daily: 'daily',
  weekdays: 'weekdays',
  weekly: 'weekly',
  monthly: 'monthly',
}

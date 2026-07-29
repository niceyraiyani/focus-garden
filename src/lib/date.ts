/** Local-date helpers. All productivity math uses the user's local calendar. */

/** Local yyyy-mm-dd for a timestamp (or now). */
export function localDateKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Start-of-day timestamp (local) for a given date key or timestamp. */
export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Add days to a timestamp, preserving local wall-clock. */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** 0=Sun..6=Sat for a timestamp. */
export function weekdayOf(ts: number): number {
  return new Date(ts).getDay()
}

/**
 * Returns the date keys for the last `n` days ending today (inclusive),
 * oldest first.
 */
export function lastNDays(n: number, from: number = Date.now()): string[] {
  const keys: string[] = []
  const base = startOfDay(from)
  for (let i = n - 1; i >= 0; i--) {
    keys.push(localDateKey(addDays(base, -i)))
  }
  return keys
}

/** Human short label for a date key, e.g. "Mon 28". */
export function shortDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wd = dt.toLocaleDateString(undefined, { weekday: 'short' })
  return `${wd} ${d}`
}

/** True when the given date key is today (local). */
export function isToday(dateKey: string): boolean {
  return dateKey === localDateKey()
}

/** Start-of-month timestamp (local). */
export function startOfMonth(ts: number = Date.now()): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Add months, clamping to valid dates. */
export function addMonths(ts: number, n: number): number {
  const d = new Date(startOfMonth(ts))
  d.setMonth(d.getMonth() + n)
  return d.getTime()
}

/**
 * 42 local date keys (6 weeks) covering the month of `ts`, starting on the
 * Sunday on/before the 1st — a standard month grid.
 */
export function monthMatrix(ts: number): string[] {
  const first = new Date(startOfMonth(ts))
  const start = addDays(first.getTime(), -first.getDay())
  return Array.from({ length: 42 }, (_, i) => localDateKey(addDays(start, i)))
}

/** The 7 local date keys of the week containing `ts` (Sunday start). */
export function weekDates(ts: number = Date.now()): string[] {
  const base = startOfDay(ts)
  const offset = new Date(base).getDay()
  const start = addDays(base, -offset)
  return Array.from({ length: 7 }, (_, i) => localDateKey(addDays(start, i)))
}

/** "July 2026" style label for the month of `ts`. */
export function monthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** Range label for the week containing `ts`, e.g. "Jul 26 – Aug 1". */
export function weekLabel(ts: number): string {
  const days = weekDates(ts)
  const fmt = (k: string) => {
    const [y, m, d] = k.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return `${fmt(days[0])} – ${fmt(days[6])}`
}

/** 0-based month index of a date key. */
export function monthOfKey(dateKey: string): number {
  return Number(dateKey.split('-')[1]) - 1
}

/** Day-of-month number of a date key. */
export function dayOfKey(dateKey: string): number {
  return Number(dateKey.split('-')[2])
}

/** Midday timestamp for a date key (safe for month math). */
export function keyToTs(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

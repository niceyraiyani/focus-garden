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

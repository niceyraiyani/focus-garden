/** Duration formatting helpers. */

/** ms -> total whole seconds. */
export function toSeconds(ms: number): number {
  return Math.floor(ms / 1000)
}

/** Format ms as H:MM:SS or M:SS for timers. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${m}:${ss}`
}

/** Format minutes as a friendly "1h 30m" / "45m" string. */
export function formatMinutes(mins: number): string {
  const m = Math.round(mins)
  if (m <= 0) return '0m'
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}m`
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}m`
}

/** Format ms as friendly hours/minutes for reports. */
export function formatDuration(ms: number): string {
  return formatMinutes(ms / 60000)
}

/** ms -> hours with one decimal, for comparisons ("2.5h"). */
export function toHours(ms: number): number {
  return Math.round((ms / 3600000) * 10) / 10
}

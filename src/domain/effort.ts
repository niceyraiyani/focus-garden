import type { EffortLevel } from './types'

export interface EffortMeta {
  level: EffortLevel
  label: string
  /** Rough minutes hint, used only as a gentle guide in the UI. */
  hint: string
}

/** Five friendly levels, shown as 1-5 flowers. */
export const EFFORT_LEVELS: EffortMeta[] = [
  { level: 1, label: 'Tiny', hint: 'a couple of minutes' },
  { level: 2, label: 'Small', hint: 'under ~15 min' },
  { level: 3, label: 'Medium', hint: '~30 min' },
  { level: 4, label: 'Large', hint: '~1 hour' },
  { level: 5, label: 'Big Push', hint: 'a real chunk of time' },
]

export function effortMeta(level: EffortLevel): EffortMeta | null {
  if (level < 1) return null
  return EFFORT_LEVELS[level - 1] ?? null
}

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
  none: { label: 'None', color: 'var(--fg-muted)' },
  low: { label: 'Low', color: 'var(--accent-blue)' },
  medium: { label: 'Medium', color: 'var(--accent-yellow)' },
  high: { label: 'High', color: 'var(--accent-pink)' },
}

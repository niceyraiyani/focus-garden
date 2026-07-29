import type { EffortLevel } from '../domain/types'
import { EFFORT_LEVELS, effortMeta } from '../domain/effort'

interface EffortFlowersProps {
  value: EffortLevel
  onChange?: (level: EffortLevel) => void
  readOnly?: boolean
}

/** 1-5 flower effort control, or read-only display. */
export function EffortFlowers({ value, onChange, readOnly }: EffortFlowersProps) {
  if (readOnly) {
    if (!value) return null
    const meta = effortMeta(value)
    return (
      <span className="flowers" title={meta ? `Effort: ${meta.label}` : undefined} aria-label={meta ? `Effort ${meta.label}` : 'No effort set'}>
        {EFFORT_LEVELS.map((e) => (
          <span key={e.level} className={`flower-btn ${e.level <= value ? 'flower-btn--on' : ''}`}>
            🌸
          </span>
        ))}
      </span>
    )
  }

  return (
    <span className="flowers" role="group" aria-label="Effort level">
      {EFFORT_LEVELS.map((e) => (
        <button
          key={e.level}
          type="button"
          className={`flower-btn ${e.level <= value ? 'flower-btn--on' : ''}`}
          aria-pressed={e.level === value}
          title={`${e.label} — ${e.hint}`}
          onClick={() => onChange?.(e.level === value ? (0 as EffortLevel) : e.level)}
        >
          🌸
        </button>
      ))}
    </span>
  )
}

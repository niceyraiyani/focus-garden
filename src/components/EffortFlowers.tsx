import type { EffortLevel } from '../domain/types'
import { EFFORT_LEVELS, effortMeta } from '../domain/effort'
import { Icon, effortIconFor } from './Icon'
import { useSettings } from '../app/SettingsContext'

interface EffortFlowersProps {
  value: EffortLevel
  onChange?: (level: EffortLevel) => void
  readOnly?: boolean
}

/**
 * 1–5 effort control. The unit icon follows the current vibe: flowers for the
 * floral vibe, a bolt for robot, a star for plain. Filled units = the level.
 */
export function EffortFlowers({ value, onChange, readOnly }: EffortFlowersProps) {
  const { settings } = useSettings()
  const icon = effortIconFor(settings.vibe)

  if (readOnly) {
    if (!value) return null
    const meta = effortMeta(value)
    return (
      <span className="flowers" title={meta ? `Effort: ${meta.label}` : undefined} aria-label={meta ? `Effort ${meta.label}` : 'No effort set'}>
        {EFFORT_LEVELS.map((e) => (
          <span key={e.level} className={`flower-btn ${e.level <= value ? 'flower-btn--on' : ''}`}>
            <Icon name={icon} filled={e.level <= value} />
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
          <Icon name={icon} filled={e.level <= value} />
        </button>
      ))}
    </span>
  )
}

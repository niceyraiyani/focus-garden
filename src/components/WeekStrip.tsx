import type { DayBar } from '../features/insights/aggregations'
import { formatMinutes } from '../lib/time'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Seven tiny bars for the last week. Deliberately label-light — it's meant to
 * be felt in half a second, not studied.
 */
export function WeekStrip({ bars }: { bars: DayBar[] }) {
  return (
    <div className="week-strip" role="img" aria-label="Focus over the last 7 days">
      {bars.map((b) => {
        const day = new Date(`${b.dateKey}T12:00:00`).getDay()
        const cls = [
          'week-bar',
          b.isToday ? 'week-bar--today' : '',
          b.ratio >= 1 ? 'week-bar--met' : '',
          !b.isWorkday ? 'week-bar--rest' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <div key={b.dateKey} className={cls} title={`${b.dateKey}: ${formatMinutes(b.focusedMs / 60000)}`}>
            <div className="week-bar-track">
              <div className="week-bar-fill" style={{ height: `${Math.max(b.ratio * 100, b.focusedMs > 0 ? 8 : 0)}%` }} />
            </div>
            <span className="week-bar-label">{LETTERS[day]}</span>
          </div>
        )
      })}
    </div>
  )
}

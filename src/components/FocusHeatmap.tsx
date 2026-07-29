import type { Heatmap } from '../features/insights/aggregations'
import { formatMinutes } from '../lib/time'

const ROW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/**
 * A year of focus at a glance, in the spirit of a contribution graph. Intensity
 * is relative to the daily goal, so the darkest square always means "goal met".
 */
export function FocusHeatmap({ map }: { map: Heatmap }) {
  return (
    <div className="heatmap">
      <div className="heatmap-scroll">
        <div className="heatmap-months">
          {map.weeks.map((w, i) => (
            <span key={i} className="heatmap-month">
              {w.monthLabel ?? ''}
            </span>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-days">
            {ROW_LABELS.map((l, i) => (
              <span key={i} className="heatmap-day-label">
                {l}
              </span>
            ))}
          </div>
          <div className="heatmap-grid" role="img" aria-label="Focused time over the last year">
            {map.weeks.map((w, i) => (
              <div key={i} className="heatmap-week">
                {w.cells.map((c) => (
                  <span
                    key={c.dateKey}
                    className={`heatmap-cell heatmap-cell--${c.level}`}
                    title={`${c.dateKey}: ${c.focusedMs > 0 ? formatMinutes(c.focusedMs / 60000) : 'no focus'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-foot">
        <span className="heatmap-summary">
          <strong>{formatMinutes(map.totalMs / 60000)}</strong> focused across {map.activeDays}{' '}
          {map.activeDays === 1 ? 'day' : 'days'}
          {map.bestRun > 1 && <> · best run {map.bestRun} days</>}
        </span>
        <span className="heatmap-legend">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heatmap-cell heatmap-cell--${l}`} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}

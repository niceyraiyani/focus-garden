import { createPortal } from 'react-dom'
import { formatClock } from '../../lib/time'

/**
 * What you see in the floating window: the time, what you're on, and nothing
 * else. It's a glanceable anchor, not a second copy of the app — anything
 * clickable here is an invitation to fiddle instead of work.
 */
export function PipTimer({
  container,
  elapsedMs,
  overtime,
  taskTitle,
}: {
  container: HTMLElement
  elapsedMs: number
  overtime: boolean
  taskTitle: string | null
}) {
  return createPortal(
    <div className={`pip-timer ${overtime ? 'pip-timer--over' : ''}`}>
      <div className="pip-clock">{formatClock(elapsedMs)}</div>
      <div className="pip-task">{taskTitle ?? 'Focusing'}</div>
      {overtime && <div className="pip-flag">in flow</div>}
    </div>,
    container,
  )
}

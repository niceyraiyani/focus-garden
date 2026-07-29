import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../../data/db'
import { activeMs, activeMsForTask } from '../../domain/timing'
import { formatMinutes } from '../../lib/time'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Flourish } from '../../components/Flourish'
import { useSessionSegments, useTasksByIds } from './useFocusSession'

export function SessionReview({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const segments = useSessionSegments(sessionId)
  const queueTasks = useTasksByIds(session?.queue ?? [])
  const parked = useTasksByIds(session?.parkingLot ?? [])

  if (!session) return null

  const total = activeMs(segments, Date.now())
  const perTask = queueTasks
    .map((t) => ({ task: t, ms: activeMsForTask(segments, t.id) }))
    .filter((x) => x.ms > 0)
    .sort((a, b) => b.ms - a.ms)

  const completedCount = queueTasks.filter((t) => t.status === 'completed').length

  return (
    <div className="review">
      <div className="review-hero">
        <Flourish variant="sparkle" size={72} float color="var(--accent-yellow)" />
        <h1>Session complete</h1>
        <p className="review-total">You focused for {formatMinutes(total / 60000)}.</p>
      </div>

      <div className="review-cards">
        <div className="card stat-card">
          <span className="stat-big">{completedCount}</span>
          <span className="stat-label">tasks completed</span>
        </div>
        <div className="card stat-card">
          <span className="stat-big">{formatMinutes(total / 60000)}</span>
          <span className="stat-label">focused time</span>
        </div>
        <div className="card stat-card">
          <span className="stat-big">{parked.length}</span>
          <span className="stat-label">thoughts parked</span>
        </div>
      </div>

      {perTask.length > 0 && (
        <section className="card">
          <h3 className="group-title">Where your time went</h3>
          <ul className="time-breakdown">
            {perTask.map(({ task, ms }) => (
              <li key={task.id} className="breakdown-row">
                <span className={task.status === 'completed' ? 'done-title' : ''}>
                  {task.status === 'completed' && <Icon name="check" />} {task.title}
                </span>
                <span className="breakdown-time">{formatMinutes(ms / 60000)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {parked.length > 0 && (
        <section className="card">
          <h3 className="group-title"><Icon name="moon" /> Parked for later (in your Inbox)</h3>
          <ul className="parked-list">
            {parked.map((t) => (
              <li key={t.id} className="parked-item">
                {t.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="review-actions">
        <Button variant="subtle" onClick={() => navigate('/')}>
          Back to Today
        </Button>
        <Button variant="primary" onClick={onClose}>
          Plan another session
        </Button>
      </div>
    </div>
  )
}

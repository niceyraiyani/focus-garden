import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Task, List, Tag } from '../../domain/types'
import { updateTask } from '../../data/tasks'
import { localDateKey } from '../../lib/date'
import { TaskRow } from '../tasks/TaskRow'
import { TaskDetailDialog } from '../tasks/TaskDetailDialog'
import { Icon, needsHomeIconFor } from '../../components/Icon'
import { useToast } from '../../components/ToastContext'
import { useSettings } from '../../app/SettingsContext'

const MAX_SHOWN = 5

function ageDays(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 86_400_000)
}

/**
 * Surfaces undated Inbox tasks on the Today page so they don't get forgotten.
 * Each row offers one-tap triage: schedule for today, open to plan (list/date),
 * or complete via the checkbox. Oldest thoughts show first with a gentle age
 * cue so the most-neglected ones stand out.
 */
export function InboxTriage({ tasks, lists, tags }: { tasks: Task[]; lists: List[]; tags: Tag[] }) {
  const { toast } = useToast()
  const { settings } = useSettings()
  const [openTask, setOpenTask] = useState<Task | null>(null)

  if (tasks.length === 0) return null

  const sorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt)
  const shown = sorted.slice(0, MAX_SHOWN)
  const openTaskLive = openTask ? tasks.find((t) => t.id === openTask.id) ?? null : null

  function scheduleToday(t: Task) {
    void updateTask(t.id, { dueDate: localDateKey() })
    toast('Scheduled for today', {
      label: 'Undo',
      onClick: () => updateTask(t.id, { dueDate: null }),
    })
  }

  return (
    <section className="card triage">
      <div className="triage-head">
        <h2 className="group-title"><Icon name={needsHomeIconFor(settings.vibe)} /> Needs a home ({tasks.length})</h2>
        <Link to="/inbox" className="triage-link">
          organize all →
        </Link>
      </div>
      <p className="muted-note">
        Still floating with no list or date — give a couple a home so they don’t slip away.
      </p>

      <div className="task-list">
        {shown.map((t) => {
          const d = ageDays(t.createdAt)
          return (
            <TaskRow
              key={t.id}
              task={t}
              lists={lists}
              tags={tags}
              onOpen={setOpenTask}
              action={
                <span className="triage-actions">
                  {d >= 1 && (
                    <span
                      className={`age-chip ${d >= 3 ? 'age-chip--old' : ''}`}
                      title={`In your Inbox ${d} day${d > 1 ? 's' : ''}`}
                    >
                      {d}d
                    </span>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={() => scheduleToday(t)}>
                    <Icon name="calendar" /> Today
                  </button>
                  <button className="btn btn--subtle btn--sm" onClick={() => setOpenTask(t)}>
                    Plan
                  </button>
                </span>
              }
            />
          )
        })}
      </div>

      {tasks.length > MAX_SHOWN && (
        <p className="muted-note triage-more">
          +{tasks.length - MAX_SHOWN} more — <Link to="/inbox">sort them in your Inbox →</Link>
        </p>
      )}

      {openTaskLive && (
        <TaskDetailDialog task={openTaskLive} lists={lists} tags={tags} onClose={() => setOpenTask(null)} />
      )}
    </section>
  )
}

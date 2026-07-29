import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Task, List, Tag } from '../../domain/types'
import { setTaskComplete } from '../../data/tasks'
import { EffortFlowers } from '../../components/EffortFlowers'
import { PetalBurst } from '../../components/PetalBurst'
import { useToast } from '../../components/ToastContext'
import { useSubtaskCounts } from './hooks'
import { localDateKey } from '../../lib/date'
import { PRIORITY_META } from '../../domain/effort'

interface TaskRowProps {
  task: Task
  lists: List[]
  tags: Tag[]
  onOpen: (task: Task) => void
  showList?: boolean
  dragHandle?: React.ReactNode
  /** Optional extra action rendered on the right (e.g. "add to session"). */
  action?: React.ReactNode
}

function dueLabel(due: string): { text: string; overdue: boolean; soon: boolean } {
  const today = localDateKey()
  const overdue = due < today
  const soon = due === today
  const [y, m, d] = due.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  let text: string
  if (due === today) text = 'Today'
  else {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    text = localDateKey(tomorrow.getTime()) === due
      ? 'Tomorrow'
      : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return { text, overdue, soon }
}

export function TaskRow({ task, lists, tags, onOpen, showList, dragHandle, action }: TaskRowProps) {
  const { toast } = useToast()
  const counts = useSubtaskCounts(task.id)
  const [completing, setCompleting] = useState(false)
  const [burst, setBurst] = useState(0)
  const isDone = task.status === 'completed'

  const list = task.listId ? lists.find((l) => l.id === task.listId) : null
  const taskTags = task.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t)

  function onCheck() {
    if (isDone) {
      void setTaskComplete(task.id, false)
      return
    }
    complete()
  }

  function complete() {
    if (completing) return
    setCompleting(true)
    setBurst((b) => b + 1)
    // Let the bounce + petal play before the row leaves the open list.
    window.setTimeout(async () => {
      await setTaskComplete(task.id, true)
      toast('Nice — one done 🌸', {
        label: 'Undo',
        onClick: () => setTaskComplete(task.id, false),
      })
    }, 380)
  }

  const due = task.dueDate ? dueLabel(task.dueDate) : null

  return (
    <div className={`task-row ${completing ? 'task-row--completing' : ''} ${isDone ? 'task-row--done' : ''}`}>
      {dragHandle}
      <button
        className={`checkbox ${completing || isDone ? 'checkbox--on' : ''} ${completing ? 'bounce' : ''}`}
        role="checkbox"
        aria-checked={completing || isDone}
        aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onClick={onCheck}
      >
        <PetalBurst trigger={burst} />
        {(completing || isDone) && <span className="checkbox-tick">✓</span>}
      </button>

      <button className="task-main" onClick={() => onOpen(task)}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {showList && list && (
            <span className="chip" style={{ background: 'var(--soft-lavender)' }}>
              <span className="chip-dot" style={{ background: list.color }} />
              {list.icon} {list.name}
            </span>
          )}
          {due && (
            <span className={`due ${due.overdue ? 'due--over' : ''} ${due.soon ? 'due--soon' : ''}`}>
              🗓 {due.text}
            </span>
          )}
          {task.priority !== 'none' && (
            <span className="prio" style={{ color: PRIORITY_META[task.priority].color }}>
              ● {PRIORITY_META[task.priority].label}
            </span>
          )}
          {counts.total > 0 && (
            <span className="subcount">
              ☑ {counts.done}/{counts.total}
            </span>
          )}
          {task.effort > 0 && <EffortFlowers value={task.effort} readOnly />}
          {taskTags.map((t) => (
            <span key={t.id} className="tag-chip" style={tagStyle(t.color)}>
              #{t.name}
            </span>
          ))}
        </span>
      </button>

      {action}
    </div>
  )
}

function tagStyle(color: string): CSSProperties {
  return { color, borderColor: color }
}

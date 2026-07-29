import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task, List } from '../../domain/types'
import { updateTask } from '../../data/tasks'
import { useAllOpenTasks, useLists, useTags } from '../tasks/hooks'
import { TaskDetailDialog } from '../tasks/TaskDetailDialog'
import { Button, IconButton } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Flourish } from '../../components/Flourish'
import {
  monthMatrix,
  weekDates,
  addMonths,
  addDays,
  monthLabel,
  weekLabel,
  monthOfKey,
  dayOfKey,
  keyToTs,
  isToday,
  localDateKey,
  WEEKDAY_LABELS,
} from '../../lib/date'
import { focusedMsByDay } from '../insights/aggregations'
import { formatMinutes } from '../../lib/time'

type Mode = 'month' | 'week'

export function CalendarPage() {
  const tasks = useAllOpenTasks()
  const lists = useLists()
  const tags = useTags()
  const [mode, setMode] = useState<Mode>('month')
  const [ref, setRef] = useState(() => Date.now())
  const [openTask, setOpenTask] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const arr = m.get(t.dueDate) ?? []
      arr.push(t)
      m.set(t.dueDate, arr)
    }
    return m
  }, [tasks])

  const unscheduled = useMemo(() => tasks.filter((t) => !t.dueDate), [tasks])

  // Focused time per day turns the calendar into a gentle record of effort.
  const segments = useLiveQuery(() => db.segments.toArray(), [], [])
  const focusByDay = useMemo(() => focusedMsByDay(segments), [segments])
  const peakMs = useMemo(
    () => Math.max(1, ...Array.from(focusByDay.values())),
    [focusByDay],
  )

  const days = mode === 'month' ? monthMatrix(ref) : weekDates(ref)
  const refMonth = monthOfKey(localDateKey(ref))

  function step(dir: -1 | 1) {
    setRef((r) => (mode === 'month' ? addMonths(r, dir) : addDays(r, dir * 7)))
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const taskId = String(active.id)
    const overId = String(over.id)
    if (overId.startsWith('day:')) void updateTask(taskId, { dueDate: overId.slice(4) })
    else if (overId === 'unscheduled') void updateTask(taskId, { dueDate: null })
  }

  const openTaskLive = openTask ? tasks.find((t) => t.id === openTask.id) ?? null : null

  return (
    <section className="calendar">
      <header className="view-header">
        <h1 className="view-title">
          <Icon name="calendar" className="view-icon" />Calendar
        </h1>
        <div className="cal-controls">
          <div className="seg">
            <button className={`seg-item ${mode === 'month' ? 'seg-item--on' : ''}`} onClick={() => setMode('month')}>
              Month
            </button>
            <button className={`seg-item ${mode === 'week' ? 'seg-item--on' : ''}`} onClick={() => setMode('week')}>
              Week
            </button>
          </div>
          <Button variant="subtle" size="sm" onClick={() => setRef(Date.now())}>
            Today
          </Button>
          <div className="cal-nav">
            <IconButton label="Previous" onClick={() => step(-1)}>
              <Icon name="chevron-left" />
            </IconButton>
            <span className="cal-label">{mode === 'month' ? monthLabel(ref) : weekLabel(ref)}</span>
            <IconButton label="Next" onClick={() => step(1)}>
              <Icon name="chevron-right" />
            </IconButton>
          </div>
        </div>
      </header>

      <p className="cal-hint">Drag an unscheduled task onto a day to give it a due date. Drag it back to unschedule.</p>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="cal-layout">
          <div className={`cal-grid cal-grid--${mode}`}>
            {mode === 'month' &&
              WEEKDAY_LABELS.map((w) => (
                <div key={w} className="cal-weekday">
                  {w}
                </div>
              ))}
            {days.map((key) => (
              <DayCell
                key={key}
                dateKey={key}
                mode={mode}
                dimmed={mode === 'month' && monthOfKey(key) !== refMonth}
                tasks={byDay.get(key) ?? []}
                focusedMs={focusByDay.get(key) ?? 0}
                peakMs={peakMs}
                lists={lists}
                onOpen={setOpenTask}
                onExpand={(k) => {
                  setRef(keyToTs(k))
                  setMode('week')
                }}
              />
            ))}
          </div>

          <UnscheduledPanel tasks={unscheduled} lists={lists} onOpen={setOpenTask} />
        </div>
      </DndContext>

      {openTaskLive && (
        <TaskDetailDialog task={openTaskLive} lists={lists} tags={tags} onClose={() => setOpenTask(null)} />
      )}
    </section>
  )
}

function DayCell({
  dateKey,
  mode,
  dimmed,
  tasks,
  focusedMs,
  peakMs,
  lists,
  onOpen,
  onExpand,
}: {
  dateKey: string
  mode: Mode
  dimmed: boolean
  tasks: Task[]
  focusedMs: number
  peakMs: number
  lists: List[]
  onOpen: (t: Task) => void
  onExpand: (dateKey: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateKey}` })
  const cap = mode === 'month' ? 3 : 99
  const shown = tasks.slice(0, cap)
  const extra = tasks.length - shown.length

  return (
    <div
      ref={setNodeRef}
      className={`cal-cell ${dimmed ? 'cal-cell--dim' : ''} ${isToday(dateKey) ? 'cal-cell--today' : ''} ${
        isOver ? 'cal-cell--over' : ''
      } cal-cell--${mode}`}
    >
      <div className="cal-cell-head">
        <span className="cal-daynum">{dayOfKey(dateKey)}</span>
        {mode === 'week' && (
          <span className="cal-weekday-inline">
            {new Date(keyToTs(dateKey)).toLocaleDateString(undefined, { weekday: 'short' })}
          </span>
        )}
        {focusedMs > 0 && (
          <span className="cal-focus-badge" title={`${formatMinutes(focusedMs / 60000)} focused`}>
            {formatMinutes(focusedMs / 60000)}
          </span>
        )}
      </div>
      {focusedMs > 0 && (
        <div className="cal-focus-bar" aria-hidden="true">
          <div
            className="cal-focus-bar-fill"
            style={{ width: `${Math.max(12, Math.round((focusedMs / peakMs) * 100))}%` }}
          />
        </div>
      )}
      <div className="cal-cell-tasks">
        {shown.map((t) => (
          <CalendarChip key={t.id} task={t} lists={lists} onOpen={onOpen} />
        ))}
        {extra > 0 && (
          <button className="cal-more" onClick={() => onExpand(dateKey)}>
            +{extra} more
          </button>
        )}
      </div>
    </div>
  )
}

function CalendarChip({ task, lists, onOpen }: { task: Task; lists: List[]; onOpen: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const list = task.listId ? lists.find((l) => l.id === task.listId) : null
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <button
      ref={setNodeRef}
      style={style}
      className="cal-chip"
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      title={task.title}
    >
      <span className="chip-dot" style={{ background: list?.color ?? 'var(--accent-lavender)' }} />
      <span className="cal-chip-title">{task.title}</span>
    </button>
  )
}

function UnscheduledPanel({
  tasks,
  lists,
  onOpen,
}: {
  tasks: Task[]
  lists: List[]
  onOpen: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' })
  return (
    <aside ref={setNodeRef} className={`cal-unscheduled ${isOver ? 'cal-unscheduled--over' : ''}`}>
      <h2 className="group-title"><Icon name="inbox" /> Unscheduled ({tasks.length})</h2>
      {tasks.length === 0 ? (
        <div className="empty empty--sm">
          <Flourish variant="sprig" size={40} />
          <p>Everything has a date. Nice!</p>
        </div>
      ) : (
        <div className="cal-unscheduled-list">
          {tasks.map((t) => (
            <CalendarChip key={t.id} task={t} lists={lists} onOpen={onOpen} />
          ))}
        </div>
      )}
    </aside>
  )
}

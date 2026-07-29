import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, List, Tag, ID, Priority } from '../../domain/types'
import { reorderTasks } from '../../data/tasks'
import { TaskRow } from './TaskRow'
import { QuickAdd } from './QuickAdd'
import { TaskDetailDialog } from './TaskDetailDialog'
import { Flourish } from '../../components/Flourish'
import { sortTasks, filterTasks, SORT_LABELS } from './sorting'
import type { SortMode } from './sorting'
import { PRIORITY_META } from '../../domain/effort'
import { ListGlyph } from '../../components/Icon'

interface Props {
  title: string
  icon?: string
  tasks: Task[]
  lists: List[]
  tags: Tag[]
  scopeListId?: ID | null
  allowReorder?: boolean
  allowAdd?: boolean
  showList?: boolean
  emptyMessage?: string
  headerExtra?: ReactNode
  rowAction?: (task: Task) => ReactNode
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low']

function SortableRow({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  const handle = (
    <button className="drag-handle" aria-label="Reorder" {...attributes} {...listeners}>
      ⠿
    </button>
  )
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  )
}

export function TaskListView({
  title,
  icon,
  tasks,
  lists,
  tags,
  scopeListId,
  allowReorder = false,
  allowAdd = true,
  showList = false,
  emptyMessage = 'Nothing here yet — a calm, empty garden bed.',
  headerExtra,
  rowAction,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [tagFilter, setTagFilter] = useState<ID | null>(null)
  const [prioFilter, setPrioFilter] = useState<Priority | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visible = useMemo(() => {
    const filtered = filterTasks(tasks, { tagId: tagFilter, priority: prioFilter })
    return sortTasks(filtered, sortMode)
  }, [tasks, tagFilter, prioFilter, sortMode])

  const canDrag = allowReorder && sortMode === 'manual' && !tagFilter && !prioFilter
  const ids = visible.map((t) => t.id)

  // keep freshest task object open while it live-updates
  const openTaskLive = openTask ? tasks.find((t) => t.id === openTask.id) ?? openTask : null

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    const next = arrayMove(visible, oldIndex, newIndex)
    void reorderTasks(next.map((t) => t.id))
  }

  return (
    <section className="list-view">
      <header className="view-header">
        <h1 className="view-title">
          {icon && <ListGlyph icon={icon} className="view-icon" />}
          {title}
          <span className="view-count">{tasks.length}</span>
        </h1>
        {headerExtra}
      </header>

      {allowAdd && <QuickAdd listId={scopeListId ?? null} />}

      <div className="view-controls">
        <label className="control">
          <span>Sort</span>
          <select
            className="select select--sm"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <option key={m} value={m}>
                {SORT_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <div className="control filter-chips">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              className={`chip chip--button ${prioFilter === p ? 'chip--active' : ''}`}
              onClick={() => setPrioFilter(prioFilter === p ? null : p)}
            >
              <span className="chip-dot" style={{ background: PRIORITY_META[p].color }} />
              {PRIORITY_META[p].label}
            </button>
          ))}
          {tags.slice(0, 6).map((t) => (
            <button
              key={t.id}
              className={`chip chip--button ${tagFilter === t.id ? 'chip--active' : ''}`}
              onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
            >
              <span className="chip-dot" style={{ background: t.color }} />#{t.name}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <Flourish variant="bloom" size={64} float />
          <p>{emptyMessage}</p>
        </div>
      ) : canDrag ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="task-list">
              {visible.map((task) => (
                <SortableRow key={task.id} id={task.id}>
                  {(handle) => (
                    <TaskRow
                      task={task}
                      lists={lists}
                      tags={tags}
                      onOpen={setOpenTask}
                      showList={showList}
                      dragHandle={handle}
                      action={rowAction?.(task)}
                    />
                  )}
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="task-list">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              lists={lists}
              tags={tags}
              onOpen={setOpenTask}
              showList={showList}
              action={rowAction?.(task)}
            />
          ))}
        </div>
      )}

      {openTaskLive && (
        <TaskDetailDialog
          task={openTaskLive}
          lists={lists}
          tags={tags}
          onClose={() => setOpenTask(null)}
        />
      )}
    </section>
  )
}

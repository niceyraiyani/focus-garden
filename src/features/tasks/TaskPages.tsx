import { useParams, Navigate } from 'react-router-dom'
import { TaskListView } from './TaskListView'
import { TaskRow } from './TaskRow'
import { Flourish } from '../../components/Flourish'
import { Icon } from '../../components/Icon'
import { ListHeaderActions } from './ListEditorDialog'
import {
  useInboxTasks,
  useAllOpenTasks,
  useCompletedTasks,
  useListTasks,
  useActiveLists,
  useLists,
  useTags,
} from './hooks'
import { localDateKey } from '../../lib/date'

export function InboxPage() {
  const tasks = useInboxTasks()
  const lists = useActiveLists()
  const tags = useTags()
  return (
    <TaskListView
      title="Inbox"
      icon="inbox"
      tasks={tasks}
      lists={lists}
      tags={tags}
      scopeListId={null}
      allowReorder
      emptyMessage="Inbox zero! Every thought has found its place."
    />
  )
}

export function AllTasksPage() {
  const tasks = useAllOpenTasks()
  const lists = useLists()
  const tags = useTags()
  return (
    <TaskListView
      title="All tasks"
      icon="flower"
      tasks={tasks}
      lists={lists}
      tags={tags}
      allowAdd={false}
      showList
      emptyMessage="No open tasks anywhere. Beautifully clear."
    />
  )
}

export function ListPage() {
  const { id } = useParams<{ id: string }>()
  const lists = useLists()
  const activeLists = useActiveLists()
  const tags = useTags()
  const tasks = useListTasks(id ?? '')

  const list = lists.find((l) => l.id === id)
  if (lists.length > 0 && !list) return <Navigate to="/inbox" replace />

  return (
    <TaskListView
      key={id}
      title={list?.name ?? 'List'}
      icon={list?.icon ?? 'leaf'}
      tasks={tasks}
      lists={activeLists}
      tags={tags}
      scopeListId={id ?? null}
      allowReorder
      headerExtra={list ? <ListHeaderActions list={list} /> : undefined}
      emptyMessage="This list is a fresh garden bed. Plant a task!"
    />
  )
}

export function CompletedPage() {
  const tasks = useCompletedTasks()
  const lists = useLists()
  const tags = useTags()

  const groups = new Map<string, typeof tasks>()
  for (const t of tasks) {
    const key = t.completedAt ? localDateKey(t.completedAt) : 'earlier'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  return (
    <section className="list-view">
      <header className="view-header">
        <h1 className="view-title">
          <Icon name="trophy" className="view-icon" />Completed
          <span className="view-count">{tasks.length}</span>
        </h1>
      </header>

      {tasks.length === 0 ? (
        <div className="empty">
          <Flourish variant="sparkle" size={64} float />
          <p>Finished tasks bloom here. Go complete something tiny!</p>
        </div>
      ) : (
        [...groups.entries()].map(([day, dayTasks]) => (
          <div key={day} className="completed-group">
            <h2 className="group-title">{prettyDay(day)}</h2>
            <div className="task-list">
              {dayTasks.map((t) => (
                <TaskRow key={t.id} task={t} lists={lists} tags={tags} onOpen={() => {}} showList />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

function prettyDay(dateKey: string): string {
  if (dateKey === 'earlier') return 'Earlier'
  if (dateKey === localDateKey()) return 'Today'
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLists, useAllOpenTasks, useTags } from './hooks'
import { createList } from '../../data/lists'
import { Icon, ListGlyph } from '../../components/Icon'
import { Button } from '../../components/Button'
import { Panel } from '../../components/Panel'
import { Flourish } from '../../components/Flourish'
import { localDateKey } from '../../lib/date'
import type { List, Task } from '../../domain/types'

interface Folder {
  id: string | null
  name: string
  icon: string
  color: string
  href: string
  open: number
  due: number
  archived: boolean
}

/**
 * A desk of folders: every list at a glance with its open and due counts, plus
 * the Inbox. Clicking a folder opens it. This exists because the sidebar hides
 * lists behind small text — seeing them laid out makes it obvious where a
 * thought belongs.
 */
export function ListsPage() {
  const lists = useLists()
  const tasks = useAllOpenTasks()
  const tags = useTags()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const today = localDateKey()

  const folders = useMemo<Folder[]>(() => {
    const count = (match: (t: Task) => boolean) => {
      let open = 0
      let due = 0
      for (const t of tasks) {
        if (!match(t)) continue
        open++
        if (t.dueDate !== null && t.dueDate <= today) due++
      }
      return { open, due }
    }

    const inbox = count((t) => (t.listId ?? null) === null)
    const head: Folder = {
      id: null,
      name: 'Inbox',
      icon: 'inbox',
      color: 'var(--accent-lavender)',
      href: '/inbox',
      archived: false,
      ...inbox,
    }

    const rest = lists.map((l: List) => ({
      id: l.id,
      name: l.name,
      icon: l.icon,
      color: l.color,
      href: `/list/${l.id}`,
      archived: l.archived,
      ...count((t) => t.listId === l.id),
    }))

    return [head, ...rest]
  }, [lists, tasks, today])

  const active = folders.filter((f) => !f.archived)
  const archived = folders.filter((f) => f.archived)

  async function addList() {
    const trimmed = name.trim()
    setName('')
    setAdding(false)
    if (trimmed) await createList(trimmed)
  }

  const totalOpen = tasks.length

  return (
    <section className="lists-page">
      <header className="view-header">
        <h1 className="view-title">
          <Icon name="folder" className="view-icon" />
          Lists
          <span className="view-count">{active.length}</span>
        </h1>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Icon name="plus" /> New list
        </Button>
      </header>

      <Panel
        title="my lists"
        actions={
          totalOpen === 0
            ? 'nothing open'
            : `${totalOpen} open ${totalOpen === 1 ? 'task' : 'tasks'}`
        }
      >
        <div className="folder-grid">
        {active.map((f) => (
          <Link key={f.id ?? 'inbox'} to={f.href} className="folder-card">
            <span className="folder-art" style={{ color: f.color }} aria-hidden="true">
              <Icon name={f.open > 0 ? 'folder-open' : 'folder'} size={44} />
              <ListGlyph icon={f.icon} className="folder-badge" />
            </span>
            <span className="folder-name">{f.name}</span>
            <span className="folder-meta">
              {f.open === 0 ? 'empty' : `${f.open} open`}
              {f.due > 0 && <span className="folder-due">{f.due} due</span>}
            </span>
          </Link>
        ))}

        {adding ? (
          <div className="folder-card folder-card--new">
            <input
              className="input input--sm"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={addList}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addList()
                if (e.key === 'Escape') {
                  setName('')
                  setAdding(false)
                }
              }}
              placeholder="List name…"
              aria-label="New list name"
            />
          </div>
        ) : (
          <button className="folder-card folder-card--new" onClick={() => setAdding(true)}>
            <span className="folder-art" aria-hidden="true">
              <Icon name="plus" size={44} />
            </span>
            <span className="folder-name">New list</span>
            <span className="folder-meta">group your thoughts</span>
          </button>
        )}
        </div>
      </Panel>

      {archived.length > 0 && (
        <Panel title="archived">
          <div className="folder-grid">
            {archived.map((f) => (
              <Link key={f.id} to={f.href} className="folder-card folder-card--archived">
                <span className="folder-art" style={{ color: f.color }} aria-hidden="true">
                  <Icon name="folder" size={44} />
                </span>
                <span className="folder-name">{f.name}</span>
                <span className="folder-meta">{f.open === 0 ? 'empty' : `${f.open} open`}</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {lists.length === 0 && (
        <div className="empty">
          <Flourish variant="sprig" size={64} float />
          <p>No lists yet — everything lands in your Inbox. Make one when a theme shows up.</p>
        </div>
      )}

      <p className="lists-foot">
        {tags.length > 0 && `${tags.length} ${tags.length === 1 ? 'tag' : 'tags'} in use · `}
        Drag tasks between lists from any list view.
      </p>
    </section>
  )
}

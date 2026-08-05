import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { createTask } from '../data/tasks'
import { searchTasks } from '../features/tasks/search'
import { TaskDetailDialog } from '../features/tasks/TaskDetailDialog'
import { Icon } from './Icon'
import { useToast } from './ToastContext'
import type { Task } from '../domain/types'

/**
 * Search-and-capture overlay, opened with Ctrl/Cmd+K (or "/").
 *
 * One box does both jobs: type to find a task, or press Enter on "Add …" to
 * drop a thought straight into the Inbox without losing your place. That
 * matters more than a dedicated search page — the point is to get something out
 * of your head in one keystroke.
 */
/** Open the palette from anywhere (e.g. the sidebar button). */
export function openCommandPalette(): void {
  window.dispatchEvent(new CustomEvent('lockin:open-palette'))
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const capturing = useRef(false)
  const { toast } = useToast()

  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const lists = useLiveQuery(() => db.lists.toArray(), [], [])
  const tags = useLiveQuery(() => db.tags.toArray(), [], [])

  const hits = useMemo(() => searchTasks(tasks, query, lists), [tasks, query, lists])
  const trimmed = query.trim()
  // Offer capture unless something already has exactly this title.
  const canCapture =
    trimmed.length > 0 && !hits.some((h) => h.task.title.toLowerCase() === trimmed.toLowerCase())
  const rowCount = hits.length + (canCapture ? 1 : 0)

  // Global shortcut. Ignored while typing somewhere else, except for Ctrl/Cmd+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing =
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    const onOpen = () => setOpen(true)
    window.addEventListener('lockin:open-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('lockin:open-palette', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      // Wait for the input to exist before focusing it.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setIndex(0)
  }, [query])

  function close() {
    setOpen(false)
    setQuery('')
  }

  async function capture() {
    const title = trimmed
    if (!title || capturing.current) return
    // Holding Enter fires repeatedly; without this guard each repeat creates
    // another copy of the same thought before the first write lands.
    capturing.current = true
    try {
      await createTask({ title, listId: null })
      toast('Captured to your Inbox')
      close()
    } finally {
      capturing.current = false
    }
  }

  function choose(i: number) {
    if (i < hits.length) {
      setOpenTask(hits[i].task)
      close()
    } else if (canCapture) {
      void capture()
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => (rowCount === 0 ? 0 : (i + 1) % rowCount))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => (rowCount === 0 ? 0 : (i - 1 + rowCount) % rowCount))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (rowCount > 0) choose(index)
    }
  }

  // The detail dialog lives here so a result can be opened from any page.
  const liveTask = openTask ? (tasks.find((t) => t.id === openTask.id) ?? openTask) : null

  return (
    <>
      {open && (
        <div
          className="dialog-backdrop palette-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div className="palette" role="dialog" aria-modal="true" aria-label="Search or capture">
            <div className="palette-input-row">
              <Icon name="search" className="palette-icon" />
              <input
                ref={inputRef}
                className="palette-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tasks, or type to capture a thought…"
                aria-label="Search tasks or capture a thought"
              />
              <kbd className="palette-kbd">esc</kbd>
            </div>

            {rowCount > 0 && (
              <ul className="palette-results">
                {hits.map((h, i) => {
                  const list = h.task.listId ? lists.find((l) => l.id === h.task.listId) : null
                  return (
                    <li key={h.task.id}>
                      <button
                        className={`palette-row ${i === index ? 'palette-row--on' : ''}`}
                        onMouseEnter={() => setIndex(i)}
                        onClick={() => choose(i)}
                      >
                        <Icon name={h.task.status === 'completed' ? 'check' : 'circle'} />
                        <span className="palette-row-title">{h.task.title}</span>
                        <span className="palette-row-meta">{list ? list.name : 'Inbox'}</span>
                      </button>
                    </li>
                  )
                })}
                {canCapture && (
                  <li>
                    <button
                      className={`palette-row ${index === hits.length ? 'palette-row--on' : ''}`}
                      onMouseEnter={() => setIndex(hits.length)}
                      onClick={() => choose(hits.length)}
                    >
                      <Icon name="plus" />
                      <span className="palette-row-title">
                        Add “{trimmed}” to your Inbox
                      </span>
                      <span className="palette-row-meta">capture</span>
                    </button>
                  </li>
                )}
              </ul>
            )}

            {trimmed.length === 0 && (
              <p className="palette-hint">
                Type to search everything, or write a thought and press Enter to park it in your
                Inbox.
              </p>
            )}
          </div>
        </div>
      )}

      {liveTask && (
        <TaskDetailDialog
          task={liveTask}
          lists={lists}
          tags={tags}
          onClose={() => setOpenTask(null)}
        />
      )}
    </>
  )
}

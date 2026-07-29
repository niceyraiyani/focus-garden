import { useState } from 'react'
import type { Task, List, Tag, Priority, EffortLevel, ID } from '../../domain/types'
import {
  updateTask,
  deleteTask,
  moveTaskToList,
  addSubtask,
  updateSubtask,
  deleteSubtask,
} from '../../data/tasks'
import { createTag } from '../../data/tags'
import { Dialog } from '../../components/Dialog'
import { Button, IconButton } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { EffortFlowers } from '../../components/EffortFlowers'
import { useConfirm } from '../../components/ConfirmContext'
import { useSubtasks } from './hooks'
import { PRIORITY_META } from '../../domain/effort'

interface Props {
  task: Task
  lists: List[]
  tags: Tag[]
  onClose: () => void
}

const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high']

export function TaskDetailDialog({ task, lists, tags, onClose }: Props) {
  const confirm = useConfirm()
  const subtasks = useSubtasks(task.id)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [newSub, setNewSub] = useState('')
  const [newTag, setNewTag] = useState('')

  const activeLists = lists.filter((l) => !l.archived)

  function patch(p: Partial<Task>) {
    void updateTask(task.id, p)
  }

  function toggleTag(id: ID) {
    const has = task.tagIds.includes(id)
    patch({ tagIds: has ? task.tagIds.filter((t) => t !== id) : [...task.tagIds, id] })
  }

  async function addNewTag() {
    const name = newTag.trim()
    if (!name) return
    const tag = await createTag(name)
    patch({ tagIds: [...task.tagIds, tag.id] })
    setNewTag('')
  }

  async function remove() {
    const ok = await confirm({
      title: 'Delete this task?',
      message: 'It will be permanently removed from your garden.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) {
      await deleteTask(task.id)
      onClose()
    }
  }

  return (
    <Dialog open onClose={onClose} wide title="Task">
      <div className="detail-grid">
        <input
          className="input detail-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && patch({ title: title.trim() })}
          aria-label="Task title"
        />

        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => patch({ notes })}
          placeholder="Notes, links, tiny reminders…"
          aria-label="Notes"
        />

        <div className="detail-row">
          <div>
            <span className="field-label">List</span>
            <select
              className="select"
              value={task.listId ?? ''}
              onChange={(e) => moveTaskToList(task.id, e.target.value || null)}
            >
              <option value="">Inbox</option>
              {activeLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="field-label">Due date</span>
            <input
              type="date"
              className="input"
              value={task.dueDate ?? ''}
              onChange={(e) => patch({ dueDate: e.target.value || null })}
            />
          </div>
        </div>

        <div className="detail-row">
          <div>
            <span className="field-label">Priority</span>
            <div className="seg">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  className={`seg-item ${task.priority === p ? 'seg-item--on' : ''}`}
                  onClick={() => patch({ priority: p })}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">Effort</span>
            <EffortFlowers
              value={task.effort}
              onChange={(level: EffortLevel) => patch({ effort: level })}
            />
          </div>
        </div>

        <div>
          <span className="field-label">Tags</span>
          <div className="tag-row">
            {tags.map((t) => (
              <button
                key={t.id}
                className={`chip chip--button ${task.tagIds.includes(t.id) ? 'chip--active' : ''}`}
                style={{ borderColor: task.tagIds.includes(t.id) ? t.color : 'transparent' }}
                onClick={() => toggleTag(t.id)}
              >
                <span className="chip-dot" style={{ background: t.color }} />#{t.name}
              </button>
            ))}
            <input
              className="input tag-input"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
              placeholder="+ new tag"
              aria-label="New tag"
            />
          </div>
        </div>

        <div>
          <span className="field-label">Steps</span>
          <ul className="subtask-list">
            {subtasks.map((s) => (
              <li key={s.id} className="subtask">
                <button
                  className={`checkbox checkbox--sm ${s.done ? 'checkbox--on' : ''}`}
                  role="checkbox"
                  aria-checked={s.done}
                  aria-label={`Complete step ${s.title}`}
                  onClick={() => updateSubtask(s.id, { done: !s.done })}
                >
                  {s.done && <Icon name="check" className="checkbox-tick" />}
                </button>
                <span className={s.done ? 'subtask-done' : ''}>{s.title}</span>
                <IconButton label="Delete step" className="subtask-del" onClick={() => deleteSubtask(s.id)}>
                  <Icon name="close" />
                </IconButton>
              </li>
            ))}
          </ul>
          <input
            className="input"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSub.trim()) {
                addSubtask(task.id, newSub)
                setNewSub('')
              }
            }}
            placeholder="Break it into a tiny step…"
            aria-label="Add a step"
          />
        </div>

        <div className="detail-actions">
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

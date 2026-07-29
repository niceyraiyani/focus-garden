import { useState } from 'react'
import type { FormEvent } from 'react'
import { createTask } from '../../data/tasks'
import type { ID } from '../../domain/types'

interface QuickAddProps {
  listId: ID | null
  placeholder?: string
  autoFocus?: boolean
  onAdded?: (title: string) => void
}

/** Fast capture: type a title, press Enter, keep going. */
export function QuickAdd({ listId, placeholder, autoFocus, onAdded }: QuickAddProps) {
  const [title, setTitle] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    await createTask({ title: trimmed, listId })
    setTitle('')
    onAdded?.(trimmed)
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <span className="quick-add-icon" aria-hidden="true">
        🌱
      </span>
      <input
        className="quick-add-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder ?? 'Add a thought…'}
        autoFocus={autoFocus}
        aria-label="Add a task"
      />
      <button className="btn btn--primary btn--sm" type="submit" disabled={!title.trim()}>
        Add
      </button>
    </form>
  )
}

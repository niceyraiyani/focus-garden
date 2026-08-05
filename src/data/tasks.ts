import { db } from './db'
import { newId } from '../domain/ids'
import { localDateKey } from '../lib/date'
import { nextDueDate } from '../domain/recurrence'
import type { Task, Subtask, EffortLevel, Priority, ID, Repeat } from '../domain/types'

const now = () => Date.now()

/** Rank step keeps ordering stable without constant re-normalization. */
const RANK_STEP = 1000

async function nextRank(listId: ID | null): Promise<number> {
  const items = await db.tasks.where('status').equals('open').toArray()
  const inScope = items.filter((t) => (t.listId ?? null) === listId)
  const max = inScope.reduce((m, t) => Math.max(m, t.sortRank), 0)
  return max + RANK_STEP
}

export interface NewTaskInput {
  title: string
  listId?: ID | null
  notes?: string
  dueDate?: string | null
  priority?: Priority
  effort?: EffortLevel
  tagIds?: ID[]
  originSessionId?: ID | null
  repeat?: Repeat
  routine?: boolean
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const listId = input.listId ?? null
  const ts = now()
  const task: Task = {
    id: newId(),
    title: input.title.trim(),
    notes: input.notes ?? '',
    status: 'open',
    listId,
    tagIds: input.tagIds ?? [],
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? 'none',
    effort: input.effort ?? 0,
    sortRank: await nextRank(listId),
    createdAt: ts,
    updatedAt: ts,
    completedAt: null,
    originSessionId: input.originSessionId ?? null,
    repeat: input.repeat ?? 'none',
    hiddenUntil: null,
    routine: input.routine ?? false,
  }
  await db.tasks.add(task)
  return task
}

export async function updateTask(id: ID, patch: Partial<Task>): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: now() })
}

/**
 * Complete or reopen a task.
 *
 * Completing a repeating task also schedules the next occurrence and returns
 * its id, so an undo can remove it again.
 */
export async function setTaskComplete(id: ID, complete: boolean): Promise<ID | null> {
  const task = await db.tasks.get(id)
  await db.tasks.update(id, {
    status: complete ? 'completed' : 'open',
    completedAt: complete ? now() : null,
    updatedAt: now(),
  })
  if (!complete || !task) return null
  return spawnNextOccurrence(task)
}

/**
 * Create the next instance of a repeating task.
 *
 * The finished one stays completed so history, streaks and insights stay
 * honest; the new one is a fresh copy with unchecked subtasks.
 */
async function spawnNextOccurrence(task: Task): Promise<ID | null> {
  const repeat = task.repeat ?? 'none'
  if (repeat === 'none') return null
  const today = localDateKey()
  const due = nextDueDate(task.dueDate ?? today, repeat, today)
  if (!due) return null

  const ts = now()
  const next: Task = {
    ...task,
    id: newId(),
    status: 'open',
    dueDate: due,
    // Sleep until it's actually due. Ticking off a chore should empty the
    // list, not swap it for the same chore wearing a new date.
    hiddenUntil: due,
    createdAt: ts,
    updatedAt: ts,
    completedAt: null,
  }
  const steps = await db.subtasks.where('taskId').equals(task.id).toArray()
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.tasks.add(next)
    for (const s of steps) {
      await db.subtasks.add({ ...s, id: newId(), taskId: next.id, done: false, createdAt: ts, updatedAt: ts })
    }
  })
  return next.id
}

export async function moveTaskToList(id: ID, listId: ID | null): Promise<void> {
  await db.tasks.update(id, {
    listId,
    sortRank: await nextRank(listId),
    updatedAt: now(),
  })
}

export async function deleteTask(id: ID): Promise<void> {
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}

/**
 * Move every open task that's already past due onto today.
 *
 * Guilt control: a long overdue list stops being information and starts being
 * a wall of red you avoid looking at. Clearing it in one action is kinder --
 * and more honest -- than pretending last Tuesday's plan still stands.
 *
 * Returns each task's previous due date so the move can be undone.
 */
export async function rollOverdueToToday(): Promise<{ id: ID; dueDate: string | null }[]> {
  const today = localDateKey()
  const overdue = await db.tasks
    .filter((t) => t.status === 'open' && t.dueDate !== null && t.dueDate < today)
    .toArray()
  if (overdue.length === 0) return []
  const ts = now()
  const previous = overdue.map((t) => ({ id: t.id, dueDate: t.dueDate }))
  await db.transaction('rw', db.tasks, async () => {
    for (const t of overdue) {
      await db.tasks.update(t.id, { dueDate: today, updatedAt: ts })
    }
  })
  return previous
}

/** Undo a bulk reschedule by putting the original due dates back. */
export async function restoreDueDates(entries: { id: ID; dueDate: string | null }[]): Promise<void> {
  const ts = now()
  await db.transaction('rw', db.tasks, async () => {
    for (const e of entries) {
      await db.tasks.update(e.id, { dueDate: e.dueDate, updatedAt: ts })
    }
  })
}

/**
 * Persist a manual order for the given scope by reassigning sequential ranks.
 * `orderedIds` must contain exactly the open tasks of that scope in the
 * desired order.
 */
export async function reorderTasks(orderedIds: ID[]): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.tasks.update(orderedIds[i], {
        sortRank: (i + 1) * RANK_STEP,
        updatedAt: now(),
      })
    }
  })
}

// --- Subtasks ---

export async function addSubtask(taskId: ID, title: string): Promise<Subtask> {
  const existing = await db.subtasks.where('taskId').equals(taskId).toArray()
  const max = existing.reduce((m, s) => Math.max(m, s.sortRank), 0)
  const ts = now()
  const sub: Subtask = {
    id: newId(),
    taskId,
    title: title.trim(),
    done: false,
    sortRank: max + RANK_STEP,
    createdAt: ts,
    updatedAt: ts,
  }
  await db.subtasks.add(sub)
  return sub
}

export async function updateSubtask(id: ID, patch: Partial<Subtask>): Promise<void> {
  await db.subtasks.update(id, { ...patch, updatedAt: now() })
}

export async function deleteSubtask(id: ID): Promise<void> {
  await db.subtasks.delete(id)
}

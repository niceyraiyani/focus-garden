import { db } from './db'
import { newId } from '../domain/ids'
import type { Task, Subtask, EffortLevel, Priority, ID } from '../domain/types'

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
  }
  await db.tasks.add(task)
  return task
}

export async function updateTask(id: ID, patch: Partial<Task>): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: now() })
}

export async function setTaskComplete(id: ID, complete: boolean): Promise<void> {
  await db.tasks.update(id, {
    status: complete ? 'completed' : 'open',
    completedAt: complete ? now() : null,
    updatedAt: now(),
  })
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

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { localDateKey } from '../../lib/date'
import { isSleeping } from '../../domain/recurrence'
import type { Task, List, Tag, Subtask } from '../../domain/types'

/** Open, and not a repeat that's sleeping until its next date. */
const awake = (t: Task, today: string) => t.status === 'open' && !isSleeping(t, today)

export function useLists(): List[] {
  return useLiveQuery(() => db.lists.orderBy('sortRank').toArray(), [], [])
}

export function useActiveLists(): List[] {
  return useLiveQuery(
    () => db.lists.filter((l) => !l.archived).sortBy('sortRank'),
    [],
    [],
  )
}

export function useTags(): Tag[] {
  return useLiveQuery(() => db.tags.orderBy('name').toArray(), [], [])
}

export function useInboxTasks(): Task[] {
  const today = localDateKey()
  return useLiveQuery(
    () => db.tasks.filter((t) => awake(t, today) && (t.listId ?? null) === null).toArray(),
    [today],
    [],
  )
}

export function useListTasks(listId: string): Task[] {
  const today = localDateKey()
  return useLiveQuery(
    () => db.tasks.filter((t) => awake(t, today) && t.listId === listId).toArray(),
    [listId, today],
    [],
  )
}

export function useAllOpenTasks(): Task[] {
  const today = localDateKey()
  return useLiveQuery(() => db.tasks.filter((t) => awake(t, today)).toArray(), [today], [])
}

export function useCompletedTasks(): Task[] {
  return useLiveQuery(
    () =>
      db.tasks
        .where('status')
        .equals('completed')
        .reverse()
        .sortBy('completedAt'),
    [],
    [],
  )
}

/** Open tasks due today or overdue. */
export function useTodayTasks(): Task[] {
  const today = localDateKey()
  return useLiveQuery(
    () =>
      db.tasks
        .filter((t) => awake(t, today) && t.dueDate !== null && t.dueDate <= today)
        .toArray(),
    [today],
    [],
  )
}

/** Repeats that are scheduled but deliberately hidden until their next date. */
export function useSleepingTasks(): Task[] {
  const today = localDateKey()
  return useLiveQuery(
    () => db.tasks.filter((t) => t.status === 'open' && isSleeping(t, today)).toArray(),
    [today],
    [],
  )
}

export function useSubtasks(taskId: string): Subtask[] {
  return useLiveQuery(
    () => db.subtasks.where('taskId').equals(taskId).sortBy('sortRank'),
    [taskId],
    [],
  )
}

export function useSubtaskCounts(taskId: string): { done: number; total: number } {
  return useLiveQuery(
    async () => {
      const subs = await db.subtasks.where('taskId').equals(taskId).toArray()
      return { done: subs.filter((s) => s.done).length, total: subs.length }
    },
    [taskId],
    { done: 0, total: 0 },
  )
}

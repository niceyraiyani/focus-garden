import type { Task, Priority } from '../../domain/types'

export type SortMode = 'manual' | 'due' | 'priority' | 'effort' | 'created'

export const SORT_LABELS: Record<SortMode, string> = {
  manual: 'Manual',
  due: 'Due date',
  priority: 'Priority',
  effort: 'Effort',
  created: 'Newest',
}

const priorityRank: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

/**
 * Return a new sorted array. Only 'manual' reflects persisted drag order;
 * the other modes are transient views and never mutate sortRank.
 */
export function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  const copy = [...tasks]
  switch (mode) {
    case 'manual':
      return copy.sort((a, b) => a.sortRank - b.sortRank)
    case 'due':
      return copy.sort((a, b) => {
        if (a.dueDate === b.dueDate) return a.sortRank - b.sortRank
        if (a.dueDate === null) return 1
        if (b.dueDate === null) return -1
        return a.dueDate < b.dueDate ? -1 : 1
      })
    case 'priority':
      return copy.sort(
        (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.sortRank - b.sortRank,
      )
    case 'effort':
      return copy.sort((a, b) => {
        const ae = a.effort || 99
        const be = b.effort || 99
        return ae - be || a.sortRank - b.sortRank
      })
    case 'created':
      return copy.sort((a, b) => b.createdAt - a.createdAt)
  }
}

export interface TaskFilter {
  tagId: string | null
  priority: Priority | null
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((t) => {
    if (filter.tagId && !t.tagIds.includes(filter.tagId)) return false
    if (filter.priority && t.priority !== filter.priority) return false
    return true
  })
}

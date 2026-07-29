import { db } from './db'
import { newId } from '../domain/ids'
import type { List, ID } from '../domain/types'

const now = () => Date.now()
const RANK_STEP = 1000

/** Pastel palette used for list/tag color-coding (flat, theme-agnostic). */
export const LIST_COLORS = [
  'var(--accent-lavender)',
  'var(--accent-pink)',
  'var(--accent-mint)',
  'var(--accent-blue)',
  'var(--accent-peach)',
  'var(--accent-yellow)',
]

export const LIST_ICONS = ['flower', 'leaf', 'tulip', 'star', 'mushroom', 'butterfly', 'moon', 'heart']

export async function createList(name: string, color?: string, icon?: string): Promise<List> {
  const all = await db.lists.toArray()
  const max = all.reduce((m, l) => Math.max(m, l.sortRank), 0)
  const ts = now()
  const list: List = {
    id: newId(),
    name: name.trim() || 'New list',
    color: color ?? LIST_COLORS[all.length % LIST_COLORS.length],
    icon: icon ?? LIST_ICONS[all.length % LIST_ICONS.length],
    sortRank: max + RANK_STEP,
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  }
  await db.lists.add(list)
  return list
}

export async function updateList(id: ID, patch: Partial<List>): Promise<void> {
  await db.lists.update(id, { ...patch, updatedAt: now() })
}

export async function setListArchived(id: ID, archived: boolean): Promise<void> {
  await db.lists.update(id, { archived, updatedAt: now() })
}

/**
 * Delete a list. Its tasks are moved back to the Inbox rather than destroyed,
 * so nothing is lost by accident.
 */
export async function deleteList(id: ID): Promise<void> {
  await db.transaction('rw', db.lists, db.tasks, async () => {
    const tasks = await db.tasks.where('listId').equals(id).toArray()
    for (const t of tasks) {
      await db.tasks.update(t.id, { listId: null, updatedAt: now() })
    }
    await db.lists.delete(id)
  })
}

export async function reorderLists(orderedIds: ID[]): Promise<void> {
  await db.transaction('rw', db.lists, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.lists.update(orderedIds[i], {
        sortRank: (i + 1) * RANK_STEP,
        updatedAt: now(),
      })
    }
  })
}

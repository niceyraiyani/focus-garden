import { db } from './db'
import { newId } from '../domain/ids'
import { LIST_COLORS } from './lists'
import type { Tag, ID } from '../domain/types'

const now = () => Date.now()

export async function createTag(name: string, color?: string): Promise<Tag> {
  const all = await db.tags.toArray()
  const ts = now()
  const tag: Tag = {
    id: newId(),
    name: name.trim().replace(/^#/, ''),
    color: color ?? LIST_COLORS[all.length % LIST_COLORS.length],
    createdAt: ts,
    updatedAt: ts,
  }
  await db.tags.add(tag)
  return tag
}

export async function updateTag(id: ID, patch: Partial<Tag>): Promise<void> {
  await db.tags.update(id, { ...patch, updatedAt: now() })
}

/** Delete a tag and remove it from every task that referenced it. */
export async function deleteTag(id: ID): Promise<void> {
  await db.transaction('rw', db.tags, db.tasks, async () => {
    const tasks = await db.tasks.filter((t) => t.tagIds.includes(id)).toArray()
    for (const t of tasks) {
      await db.tasks.update(t.id, {
        tagIds: t.tagIds.filter((x) => x !== id),
        updatedAt: now(),
      })
    }
    await db.tags.delete(id)
  })
}

import { beforeEach, describe, it, expect } from 'vitest'
import { db } from './db'
import {
  createTask,
  reorderTasks,
  setTaskComplete,
  moveTaskToList,
  addSubtask,
  deleteTask,
} from './tasks'

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.subtasks.clear(), db.lists.clear()])
})

describe('task repository', () => {
  it('creates tasks in the Inbox with increasing sort ranks', async () => {
    const a = await createTask({ title: 'a' })
    const b = await createTask({ title: 'b' })
    expect(a.listId).toBeNull()
    expect(a.status).toBe('open')
    expect(b.sortRank).toBeGreaterThan(a.sortRank)
  })

  it('reorders tasks by reassigning ranks in the given order', async () => {
    const a = await createTask({ title: 'a' })
    const b = await createTask({ title: 'b' })
    const c = await createTask({ title: 'c' })
    await reorderTasks([c.id, a.id, b.id])
    const ranks = await Promise.all(
      [c.id, a.id, b.id].map(async (id) => (await db.tasks.get(id))!.sortRank),
    )
    expect(ranks[0]).toBeLessThan(ranks[1])
    expect(ranks[1]).toBeLessThan(ranks[2])
  })

  it('completing a task records a completedAt timestamp', async () => {
    const a = await createTask({ title: 'a' })
    await setTaskComplete(a.id, true)
    const done = await db.tasks.get(a.id)
    expect(done!.status).toBe('completed')
    expect(done!.completedAt).toBeGreaterThan(0)
    await setTaskComplete(a.id, false)
    const reopened = await db.tasks.get(a.id)
    expect(reopened!.status).toBe('open')
    expect(reopened!.completedAt).toBeNull()
  })

  it('moves a task to a list', async () => {
    const a = await createTask({ title: 'a' })
    await moveTaskToList(a.id, 'list-1')
    expect((await db.tasks.get(a.id))!.listId).toBe('list-1')
  })

  it('deleting a task removes its subtasks', async () => {
    const a = await createTask({ title: 'a' })
    await addSubtask(a.id, 'step 1')
    await addSubtask(a.id, 'step 2')
    expect(await db.subtasks.where('taskId').equals(a.id).count()).toBe(2)
    await deleteTask(a.id)
    expect(await db.tasks.get(a.id)).toBeUndefined()
    expect(await db.subtasks.where('taskId').equals(a.id).count()).toBe(0)
  })
})

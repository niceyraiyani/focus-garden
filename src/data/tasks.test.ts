import { beforeEach, describe, it, expect } from 'vitest'
import { db } from './db'
import { localDateKey } from '../lib/date'
import {
  createTask,
  reorderTasks,
  setTaskComplete,
  moveTaskToList,
  addSubtask,
  deleteTask,
  rollOverdueToToday,
  restoreDueDates,
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

  describe('rolling overdue tasks to today', () => {
    const today = localDateKey()
    const yesterday = localDateKey(Date.now() - 86400000)
    const lastWeek = localDateKey(Date.now() - 7 * 86400000)
    const tomorrow = localDateKey(Date.now() + 86400000)

    it('moves only open, past-due tasks', async () => {
      const old = await createTask({ title: 'old', dueDate: lastWeek })
      const due = await createTask({ title: 'due', dueDate: today })
      const later = await createTask({ title: 'later', dueDate: tomorrow })
      const undated = await createTask({ title: 'undated' })

      const moved = await rollOverdueToToday()

      expect(moved.map((m) => m.id)).toEqual([old.id])
      expect((await db.tasks.get(old.id))!.dueDate).toBe(today)
      expect((await db.tasks.get(due.id))!.dueDate).toBe(today)
      expect((await db.tasks.get(later.id))!.dueDate).toBe(tomorrow)
      expect((await db.tasks.get(undated.id))!.dueDate).toBeNull()
    })

    it('leaves completed tasks in the past where they belong', async () => {
      const done = await createTask({ title: 'done', dueDate: lastWeek })
      await setTaskComplete(done.id, true)
      expect(await rollOverdueToToday()).toEqual([])
      expect((await db.tasks.get(done.id))!.dueDate).toBe(lastWeek)
    })

    it('reports nothing to do when nothing is overdue', async () => {
      await createTask({ title: 'due', dueDate: today })
      expect(await rollOverdueToToday()).toEqual([])
    })

    it('can be undone, restoring each original due date', async () => {
      const a = await createTask({ title: 'a', dueDate: lastWeek })
      const b = await createTask({ title: 'b', dueDate: yesterday })

      const moved = await rollOverdueToToday()
      expect((await db.tasks.get(a.id))!.dueDate).toBe(today)

      await restoreDueDates(moved)
      expect((await db.tasks.get(a.id))!.dueDate).toBe(lastWeek)
      expect((await db.tasks.get(b.id))!.dueDate).toBe(yesterday)
    })
  })
})

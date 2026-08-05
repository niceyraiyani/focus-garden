import { beforeEach, describe, it, expect } from 'vitest'
import { db } from './db'
import { localDateKey } from '../lib/date'
import { isSleeping } from '../domain/recurrence'
import {
  createTask,
  reorderTasks,
  setTaskComplete,
  moveTaskToList,
  addSubtask,
  updateSubtask,
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

  describe('repeating tasks', () => {
    const today = localDateKey()
    const tomorrow = localDateKey(Date.now() + 86400000)

    it('schedules the next occurrence and hides it until it is due', async () => {
      const a = await createTask({ title: 'laundry', dueDate: today, repeat: 'daily' })
      const spawned = await setTaskComplete(a.id, true)

      expect(spawned).not.toBeNull()
      const next = (await db.tasks.get(spawned!))!
      expect(next.title).toBe('laundry')
      expect(next.status).toBe('open')
      expect(next.dueDate).toBe(tomorrow)
      // The whole point: it's out of sight until its day comes round.
      expect(next.hiddenUntil).toBe(tomorrow)
      expect(isSleeping(next, today)).toBe(true)
      expect(isSleeping(next, tomorrow)).toBe(false)
    })

    it('leaves the finished occurrence completed, so history stays honest', async () => {
      const a = await createTask({ title: 'meds', dueDate: today, repeat: 'daily' })
      await setTaskComplete(a.id, true)
      const done = (await db.tasks.get(a.id))!
      expect(done.status).toBe('completed')
      expect(done.completedAt).not.toBeNull()
    })

    it('copies steps to the next occurrence, unchecked', async () => {
      const a = await createTask({ title: 'weekly review', dueDate: today, repeat: 'weekly' })
      const s = await addSubtask(a.id, 'read notes')
      await updateSubtask(s.id, { done: true })

      const spawned = await setTaskComplete(a.id, true)
      const steps = await db.subtasks.where('taskId').equals(spawned!).toArray()
      expect(steps.map((x) => x.title)).toEqual(['read notes'])
      expect(steps[0].done).toBe(false)
      expect(steps[0].id).not.toBe(s.id)
    })

    it('does not spawn anything for one-off tasks', async () => {
      const a = await createTask({ title: 'one off', dueDate: today })
      expect(await setTaskComplete(a.id, true)).toBeNull()
      expect(await db.tasks.count()).toBe(1)
    })

    it('spawns nothing when reopening a task', async () => {
      const a = await createTask({ title: 'laundry', dueDate: today, repeat: 'daily' })
      const spawned = await setTaskComplete(a.id, true)
      await deleteTask(spawned!)
      expect(await setTaskComplete(a.id, false)).toBeNull()
      expect(await db.tasks.count()).toBe(1)
    })

    it('undoing a completion can remove the occurrence it created', async () => {
      const a = await createTask({ title: 'bins', dueDate: today, repeat: 'weekly' })
      const spawned = await setTaskComplete(a.id, true)
      expect(await db.tasks.count()).toBe(2)

      await setTaskComplete(a.id, false)
      await deleteTask(spawned!)

      expect(await db.tasks.count()).toBe(1)
      expect((await db.tasks.get(a.id))!.status).toBe('open')
    })
  })
})

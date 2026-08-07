import { beforeEach, describe, it, expect } from 'vitest'
import { db, DEFAULT_SETTINGS, ensureSeeded } from './db'
import { setTaskComplete, updateTask, rollOverdueToToday } from './tasks'
import { exportBackup, importBackup } from './backup'
import { buildObservations } from '../features/insights/observations'
import { isSleeping } from '../domain/recurrence'
import { localDateKey } from '../lib/date'
import type { Task, Settings } from '../domain/types'

/**
 * Guards against silently destroying data that already exists.
 *
 * Every record here is written in the shape the *original* build produced —
 * before repeats, routines, sleeping tasks, quick links or the daily nudge
 * existed. Real data on a real device looks like this, and the app has to keep
 * working on it without losing anything or needing a migration.
 *
 * If a future change breaks this, it breaks here rather than on someone's
 * laptop three weeks of notes later.
 */

/** A task exactly as the first version of the app stored it. */
function originalTask(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title,
    notes: 'notes worth keeping',
    status: 'open',
    listId: null,
    tagIds: [],
    dueDate: null,
    priority: 'none',
    effort: 0,
    sortRank: 1000,
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    originSessionId: null,
    ...extra,
  } as unknown as Task
}

/** Settings exactly as the first version stored them: none of the later keys. */
const ORIGINAL_SETTINGS = {
  id: 'app',
  theme: 'dark',
  decorativeMotion: true,
  celebrations: true,
  notificationsEnabled: true,
  defaultMinMinutes: 25,
  workdays: [1, 2, 3, 4, 5],
  dailyGoalMinutes: 90,
  blocklist: ['youtube.com'],
  version: 1,
} as unknown as Settings

beforeEach(async () => {
  await Promise.all([
    db.tasks.clear(),
    db.subtasks.clear(),
    db.lists.clear(),
    db.tags.clear(),
    db.sessions.clear(),
    db.segments.clear(),
    db.settings.clear(),
  ])
})

describe('data written by older versions', () => {
  it('backfills settings added since, without touching what was there', async () => {
    await db.settings.put(ORIGINAL_SETTINGS)
    await ensureSeeded()

    const s = (await db.settings.get('app'))!
    // Your choices survive.
    expect(s.dailyGoalMinutes).toBe(90)
    expect(s.defaultMinMinutes).toBe(25)
    expect(s.blocklist).toEqual(['youtube.com'])
    // Everything newer is present rather than undefined.
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      expect(s, `settings is missing "${key}" after seeding`).toHaveProperty(key)
    }
  })

  it('never overwrites a settings row that already exists', async () => {
    await db.settings.put({ ...ORIGINAL_SETTINGS, dailyGoalMinutes: 240 })
    await ensureSeeded()
    await ensureSeeded()
    expect((await db.settings.get('app'))!.dailyGoalMinutes).toBe(240)
  })

  it('treats a task with no repeat/routine/hiddenUntil as an ordinary task', async () => {
    await db.tasks.put(originalTask('t1', 'Write chapter 3'))
    const t = (await db.tasks.get('t1'))!

    expect(isSleeping(t, localDateKey())).toBe(false)
    expect(t.routine).toBeUndefined()
    // Completing it must not try to spawn a follow-up.
    expect(await setTaskComplete('t1', true)).toBeNull()
    expect(await db.tasks.count()).toBe(1)
  })

  it('keeps notes and edits intact through an update', async () => {
    await db.tasks.put(originalTask('t1', 'Write chapter 3'))
    await updateTask('t1', { priority: 'high' })
    const t = (await db.tasks.get('t1'))!
    expect(t.notes).toBe('notes worth keeping')
    expect(t.priority).toBe('high')
    expect(t.title).toBe('Write chapter 3')
  })

  it('sweeps overdue tasks that predate the feature entirely', async () => {
    const old = localDateKey(Date.now() - 7 * 86400000)
    await db.tasks.put(originalTask('t1', 'Old thing', { dueDate: old }))
    const moved = await rollOverdueToToday()
    expect(moved).toHaveLength(1)
    expect((await db.tasks.get('t1'))!.dueDate).toBe(localDateKey())
  })

  it('produces observations from old sessions without inventing anything', async () => {
    const now = Date.now()
    for (let i = 1; i < 6; i++) {
      const start = now - i * 86400000
      await db.sessions.put({
        id: `s${i}`,
        status: 'completed',
        queue: [],
        activeTaskId: null,
        parkingLot: [],
        completedTaskIds: [],
        minMinutes: 25,
        startedAt: start,
        endedAt: start + 40 * 60000,
        lastActiveAt: start + 40 * 60000,
        notifiedMinReached: true,
        createdAt: start,
        updatedAt: start,
      })
      await db.segments.put({
        id: `g${i}`,
        sessionId: `s${i}`,
        taskId: null,
        startedAt: start,
        endedAt: start + 40 * 60000,
      })
    }
    const obs = buildObservations({
      segments: await db.segments.toArray(),
      sessions: await db.sessions.toArray(),
      nowTs: now,
    })
    expect(obs.length).toBeGreaterThan(0)
  })

  it('restores an old backup without losing anything', async () => {
    await db.settings.put(ORIGINAL_SETTINGS)
    await db.tasks.put(originalTask('t1', 'Write chapter 3'))
    await db.lists.put({
      id: 'l1',
      name: 'Thesis',
      color: 'var(--accent-mint)',
      icon: 'leaf',
      sortRank: 1000,
      archived: false,
      createdAt: 1,
      updatedAt: 1,
    })

    // Round-trip through JSON, exactly as the file on disk would.
    const backup = JSON.stringify(await exportBackup())
    await db.tasks.clear()
    await db.lists.clear()
    await importBackup(backup)

    expect((await db.tasks.get('t1'))!.notes).toBe('notes worth keeping')
    expect((await db.lists.get('l1'))!.name).toBe('Thesis')
  })
})

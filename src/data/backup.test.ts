import { beforeEach, describe, it, expect } from 'vitest'
import { db } from './db'
import { createTask } from './tasks'
import { exportBackup, importBackup } from './backup'

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

describe('backup', () => {
  it('round-trips data through export and import', async () => {
    const t = await createTask({ title: 'remember the milk' })
    const data = await exportBackup()
    expect(data.format).toBe('focus-garden-backup')

    await db.tasks.clear()
    expect(await db.tasks.get(t.id)).toBeUndefined()

    await importBackup(JSON.stringify(data))
    const restored = await db.tasks.get(t.id)
    expect(restored?.title).toBe('remember the milk')
  })

  it('rejects a file that is not a valid backup', async () => {
    await expect(importBackup('{"nope":true}')).rejects.toThrow()
  })
})

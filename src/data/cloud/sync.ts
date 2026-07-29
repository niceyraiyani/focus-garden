import { db } from '../db'
import { exportBackup, importBackup } from '../backup'
import { getSupabase } from './client'

/**
 * Whole-dataset cloud sync. The entire local database is serialized (reusing the
 * backup format) and stored as a single per-user row in the `snapshots` table.
 * Pull replaces local data with the cloud snapshot; push uploads local data.
 */

const TABLE = 'snapshots'

// While we're applying a remote snapshot we must not treat the resulting local
// writes as user edits (that would immediately push them back up).
let applyingRemote = false
const listeners = new Set<() => void>()
let hooksInstalled = false

function emitChange(): void {
  if (applyingRemote) return
  for (const l of listeners) l()
}

/** Register Dexie CRUD hooks once so edits anywhere can trigger an auto-sync. */
export function installChangeHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true
  const tables = [db.tasks, db.subtasks, db.lists, db.tags, db.sessions, db.segments, db.settings]
  for (const t of tables) {
    t.hook('creating', () => {
      queueMicrotask(emitChange)
    })
    t.hook('updating', () => {
      queueMicrotask(emitChange)
    })
    t.hook('deleting', () => {
      queueMicrotask(emitChange)
    })
  }
}

export function subscribeLocalChanges(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export async function localHasData(): Promise<boolean> {
  const [tasks, lists, tags] = await Promise.all([db.tasks.count(), db.lists.count(), db.tags.count()])
  return tasks + lists + tags > 0
}

export async function localModifiedAt(): Promise<number> {
  const [tasks, subtasks, lists, tags, sessions] = await Promise.all([
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.lists.toArray(),
    db.tags.toArray(),
    db.sessions.toArray(),
  ])
  let max = 0
  for (const r of [...tasks, ...subtasks, ...lists, ...tags, ...sessions]) {
    if (r.updatedAt && r.updatedAt > max) max = r.updatedAt
  }
  return max
}

export async function getCloudUpdatedAt(userId: string): Promise<number | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from(TABLE).select('updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  const ts = data?.updated_at as string | undefined
  return ts ? new Date(ts).getTime() : null
}

export async function pushSnapshot(userId: string): Promise<number> {
  const sb = getSupabase()
  if (!sb) throw new Error('Cloud is not configured.')
  const data = await exportBackup()
  const updatedAt = data.exportedAt
  const { error } = await sb.from(TABLE).upsert({
    user_id: userId,
    data,
    updated_at: new Date(updatedAt).toISOString(),
    device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
  })
  if (error) throw new Error(error.message)
  return updatedAt
}

export async function pullSnapshot(userId: string): Promise<number | null> {
  const sb = getSupabase()
  if (!sb) throw new Error('Cloud is not configured.')
  const { data, error } = await sb.from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.data) return null
  applyingRemote = true
  try {
    await importBackup(JSON.stringify(data.data))
  } finally {
    // Reset after microtasks so any change hooks queued during import stay suppressed.
    setTimeout(() => {
      applyingRemote = false
    }, 0)
  }
  const ts = data.updated_at as string | undefined
  return ts ? new Date(ts).getTime() : Date.now()
}

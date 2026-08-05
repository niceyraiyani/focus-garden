import { db } from '../db'
import { exportBackup, importBackup } from '../backup'
import { getSupabase } from './client'
import { bumpLocalRev } from './config'

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
  // Record that something changed locally, including deletions. Row counts
  // alone can't tell "never had data" from "deleted everything".
  bumpLocalRev()
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

export class CloudConflictError extends Error {
  constructor() {
    super('The cloud copy changed on another device.')
    this.name = 'CloudConflictError'
  }
}

export interface CloudMeta {
  updatedAt: number | null
  rev: number | null
}

export async function getCloudMeta(userId: string): Promise<CloudMeta> {
  const sb = getSupabase()
  if (!sb) return { updatedAt: null, rev: null }
  const { data, error } = await sb
    .from(TABLE)
    .select('updated_at, rev')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return { updatedAt: null, rev: null }
  const ts = data.updated_at as string | undefined
  return {
    updatedAt: ts ? new Date(ts).getTime() : null,
    rev: typeof data.rev === 'number' ? data.rev : null,
  }
}

export async function getCloudUpdatedAt(userId: string): Promise<number | null> {
  return (await getCloudMeta(userId)).updatedAt
}

export interface PushResult {
  updatedAt: number
  rev: number
}

/**
 * Upload the whole dataset, but only if the cloud is still at the revision
 * this device last saw. `knownRev` of null means "there should be no row yet".
 *
 * Without this a device that has been offline would happily upload its stale
 * snapshot over another device's newer one, and the work done there would
 * simply vanish. On mismatch we throw so the caller can ask the user instead
 * of picking a winner silently.
 */
export async function pushSnapshot(userId: string, knownRev: number | null): Promise<PushResult> {
  const sb = getSupabase()
  if (!sb) throw new Error('Cloud is not configured.')
  const data = await exportBackup()
  const updatedAt = data.exportedAt
  const row = {
    data,
    updated_at: new Date(updatedAt).toISOString(),
    device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
  }

  if (knownRev === null) {
    // First push for this user: succeed only if no row exists yet.
    const { data: inserted, error } = await sb
      .from(TABLE)
      .insert({ user_id: userId, rev: 1, ...row })
      .select('rev')
      .maybeSingle()
    if (error) {
      // 23505 = unique violation, i.e. another device got there first.
      if ((error as { code?: string }).code === '23505') throw new CloudConflictError()
      throw new Error(error.message)
    }
    const rev = (inserted?.rev as number | undefined) ?? 1
    return { updatedAt, rev }
  }

  const { data: updated, error } = await sb
    .from(TABLE)
    .update({ rev: knownRev + 1, ...row })
    .eq('user_id', userId)
    .eq('rev', knownRev)
    .select('rev')
  if (error) throw new Error(error.message)
  // No rows matched: the cloud moved on since we last looked.
  if (!updated || updated.length === 0) throw new CloudConflictError()
  return { updatedAt, rev: (updated[0].rev as number | undefined) ?? knownRev + 1 }
}

/** Upload unconditionally, taking whatever revision the cloud is at. Used
 *  only when the user has explicitly chosen "keep this device". */
export async function forcePushSnapshot(userId: string): Promise<PushResult> {
  const meta = await getCloudMeta(userId)
  if (meta.rev === null) return pushSnapshot(userId, null)
  return pushSnapshot(userId, meta.rev)
}

export interface PullResult {
  updatedAt: number
  rev: number | null
}

export async function pullSnapshot(userId: string): Promise<PullResult | null> {
  const sb = getSupabase()
  if (!sb) throw new Error('Cloud is not configured.')
  const { data, error } = await sb
    .from(TABLE)
    .select('data, updated_at, rev')
    .eq('user_id', userId)
    .maybeSingle()
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
  return {
    updatedAt: ts ? new Date(ts).getTime() : Date.now(),
    rev: typeof data.rev === 'number' ? data.rev : null,
  }
}

import { db, DEFAULT_SETTINGS } from './db'
import type {
  Task,
  Subtask,
  List,
  Tag,
  FocusSession,
  FocusSegment,
  Settings,
} from '../domain/types'

export interface BackupData {
  format: 'focus-garden-backup'
  version: number
  exportedAt: number
  tasks: Task[]
  subtasks: Subtask[]
  lists: List[]
  tags: Tag[]
  sessions: FocusSession[]
  segments: FocusSegment[]
  settings: Settings
}

export async function exportBackup(): Promise<BackupData> {
  const [tasks, subtasks, lists, tags, sessions, segments, settings] = await Promise.all([
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.lists.toArray(),
    db.tags.toArray(),
    db.sessions.toArray(),
    db.segments.toArray(),
    db.settings.get('app'),
  ])
  return {
    format: 'focus-garden-backup',
    version: 1,
    exportedAt: Date.now(),
    tasks,
    subtasks,
    lists,
    tags,
    sessions,
    segments,
    settings: settings ?? { ...DEFAULT_SETTINGS },
  }
}

/** Trigger a browser download of the current data as JSON. */
export async function downloadBackup(): Promise<void> {
  const data = await exportBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `lockin-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return d.format === 'focus-garden-backup' && Array.isArray(d.tasks) && Array.isArray(d.lists)
}

/**
 * Replace all local data with the contents of a backup. This is destructive
 * by design; callers must confirm with the user first.
 */
export async function importBackup(json: string): Promise<void> {
  const parsed: unknown = JSON.parse(json)
  if (!isBackup(parsed)) {
    throw new Error('This file is not a valid lock.in backup.')
  }
  const data = parsed
  await db.transaction(
    'rw',
    [db.tasks, db.subtasks, db.lists, db.tags, db.sessions, db.segments, db.settings],
    async () => {
      await Promise.all([
        db.tasks.clear(),
        db.subtasks.clear(),
        db.lists.clear(),
        db.tags.clear(),
        db.sessions.clear(),
        db.segments.clear(),
        db.settings.clear(),
      ])
      await db.tasks.bulkAdd(data.tasks)
      await db.subtasks.bulkAdd(data.subtasks ?? [])
      await db.lists.bulkAdd(data.lists)
      await db.tags.bulkAdd(data.tags ?? [])
      await db.sessions.bulkAdd(data.sessions ?? [])
      await db.segments.bulkAdd(data.segments ?? [])
      await db.settings.put({ ...DEFAULT_SETTINGS, ...data.settings, id: 'app' })
    },
  )
}

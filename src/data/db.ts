import Dexie from 'dexie'
import type { Table } from 'dexie'
import type {
  Task,
  Subtask,
  List,
  Tag,
  FocusSession,
  FocusSegment,
  Settings,
} from '../domain/types'

/**
 * Local-first IndexedDB store. All persisted domain state lives here and is
 * reached only through the repositories in ./repositories.ts. Records are
 * plain serializable objects with stable ids and createdAt/updatedAt so a
 * future sync layer can be added without touching the UI.
 */
export class FocusGardenDB extends Dexie {
  tasks!: Table<Task, string>
  subtasks!: Table<Subtask, string>
  lists!: Table<List, string>
  tags!: Table<Tag, string>
  sessions!: Table<FocusSession, string>
  segments!: Table<FocusSegment, string>
  settings!: Table<Settings, string>

  constructor() {
    super('focus-garden')
    this.version(1).stores({
      tasks: 'id, listId, status, sortRank, createdAt, completedAt',
      subtasks: 'id, taskId, sortRank',
      lists: 'id, sortRank, archived',
      tags: 'id, name',
      sessions: 'id, status, startedAt',
      segments: 'id, sessionId, taskId, startedAt',
      settings: 'id',
    })
  }
}

export const db = new FocusGardenDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  theme: 'system',
  accent: 'white',
  vibe: 'flowers',
  retro: true,
  defaultMinMinutes: 30,
  notificationsEnabled: true,
  dailyNudge: false,
  dailyNudgeAt: '09:00',
  workdays: [1, 2, 3, 4, 5],
  dailyGoalMinutes: 120,
  decorativeMotion: true,
  celebrations: true,
  blocklist: ['youtube.com', 'reddit.com', 'instagram.com', 'x.com', 'tiktok.com'],
  quickLinks: [],
  nextUp: null,
  version: 1,
}

/**
 * Ensure a settings row exists, and that it has every key the app now expects.
 *
 * Backfilling matters more than it looks. Settings saved by an older build
 * simply lack fields added since, and the day any code reads one of those
 * without a `??` fallback it breaks — but only for people who already had
 * data, never in fresh testing. Filling the gaps here means an old row and a
 * new one are the same shape, so that class of bug can't happen.
 *
 * Existing values always win; this only ever adds what's missing.
 */
export async function ensureSeeded(): Promise<void> {
  const existing = await db.settings.get('app')
  if (!existing) {
    await db.settings.put({ ...DEFAULT_SETTINGS })
    return
  }
  const missing: Partial<Settings> = {}
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(key in existing)) {
      Object.assign(missing, { [key]: value })
    }
  }
  if (Object.keys(missing).length > 0) {
    await db.settings.update('app', missing)
  }
}

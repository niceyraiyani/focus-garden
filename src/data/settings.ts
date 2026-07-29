import { db, DEFAULT_SETTINGS } from './db'
import type { Settings } from '../domain/types'

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app')
  return s ?? { ...DEFAULT_SETTINGS }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'app' })
}

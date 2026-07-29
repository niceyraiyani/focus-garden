import { db, DEFAULT_SETTINGS } from './db'
import type { Settings } from '../domain/types'

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app')
  // Merge with defaults so settings saved before a new field was added still
  // get sensible values (lightweight forward-migration).
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), id: 'app' }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'app' })
}

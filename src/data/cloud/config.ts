/**
 * Cloud connection settings live in localStorage (not IndexedDB) so they are
 * per-device and never end up inside a synced snapshot. The Supabase anon key
 * is safe to keep client-side — it only works together with row-level security.
 */

const URL_KEY = 'lockin.cloud.url'
const ANON_KEY = 'lockin.cloud.anonKey'

export interface CloudConfig {
  url: string
  anonKey: string
}

export function getCloudConfig(): CloudConfig | null {
  try {
    const url = localStorage.getItem(URL_KEY)?.trim()
    const anonKey = localStorage.getItem(ANON_KEY)?.trim()
    if (url && anonKey) return { url, anonKey }
  } catch {
    /* localStorage unavailable */
  }
  return null
}

export function setCloudConfig(cfg: CloudConfig): void {
  localStorage.setItem(URL_KEY, cfg.url.trim())
  localStorage.setItem(ANON_KEY, cfg.anonKey.trim())
}

export function clearCloudConfig(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(ANON_KEY)
}

export function isCloudConfigured(): boolean {
  return getCloudConfig() != null
}

/** Per-user "last successfully synced at" watermark, used to detect conflicts. */
export function getLastSyncedAt(userId: string): number | null {
  const v = localStorage.getItem(`lockin.cloud.synced.${userId}`)
  return v ? Number(v) : null
}

export function setLastSyncedAt(userId: string, ms: number): void {
  localStorage.setItem(`lockin.cloud.synced.${userId}`, String(ms))
}

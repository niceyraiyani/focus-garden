/**
 * Cloud connection settings.
 *
 * A project can be baked in at build time (VITE_SUPABASE_URL / _ANON_KEY), which
 * is what makes sign-in zero-setup for everyone using the hosted app. Anyone who
 * would rather keep their data in their own project can override it from
 * Settings; that override lives in localStorage, so it's per-device and never
 * ends up inside a synced snapshot.
 *
 * The anon key is safe to ship publicly — it only grants what row-level security
 * allows, which is "your own row and nothing else".
 */

const URL_KEY = 'lockin.cloud.url'
const ANON_KEY = 'lockin.cloud.anonKey'

export interface CloudConfig {
  url: string
  anonKey: string
}

/** The project compiled into this build, if one was configured. */
export function getBuiltInConfig(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return url && anonKey ? { url, anonKey } : null
}

export function hasBuiltInConfig(): boolean {
  return getBuiltInConfig() != null
}

function getOverride(): CloudConfig | null {
  try {
    const url = localStorage.getItem(URL_KEY)?.trim()
    const anonKey = localStorage.getItem(ANON_KEY)?.trim()
    if (url && anonKey) return { url, anonKey }
  } catch {
    /* localStorage unavailable */
  }
  return null
}

export function hasOverride(): boolean {
  return getOverride() != null
}

export function getCloudConfig(): CloudConfig | null {
  return getOverride() ?? getBuiltInConfig()
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

/**
 * The cloud revision this device last saw. Every push must name the revision
 * it is replacing; if the cloud has moved on, the write is refused rather than
 * overwriting whatever another device wrote in the meantime.
 */
export function getKnownRev(userId: string): number | null {
  const v = localStorage.getItem(`lockin.cloud.rev.${userId}`)
  return v ? Number(v) : null
}

export function setKnownRev(userId: string, rev: number): void {
  localStorage.setItem(`lockin.cloud.rev.${userId}`, String(rev))
}

export function clearKnownRev(userId: string): void {
  localStorage.removeItem(`lockin.cloud.rev.${userId}`)
}

/**
 * A local change counter. Unlike "do we have rows?", this still tells us the
 * user changed something when the change was a deletion — without it, deleting
 * your last task offline looks identical to a fresh install and the old cloud
 * snapshot gets pulled back over it.
 */
export function bumpLocalRev(): number {
  const next = getLocalRev() + 1
  try {
    localStorage.setItem('lockin.cloud.localRev', String(next))
  } catch {
    /* ignore */
  }
  return next
}

export function getLocalRev(): number {
  try {
    return Number(localStorage.getItem('lockin.cloud.localRev') ?? '0')
  } catch {
    return 0
  }
}

export function getSyncedLocalRev(userId: string): number | null {
  const v = localStorage.getItem(`lockin.cloud.localRevSynced.${userId}`)
  return v ? Number(v) : null
}

export function setSyncedLocalRev(userId: string, rev: number): void {
  localStorage.setItem(`lockin.cloud.localRevSynced.${userId}`, String(rev))
}

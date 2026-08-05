/**
 * Pure decision logic for the first sync after sign-in. Kept dependency-free so
 * it can be unit-tested without Supabase or IndexedDB.
 *
 * lock.in syncs the whole dataset as one per-user snapshot (last-write-wins).
 * That is more than enough for a single person across a couple of devices, and
 * we only ever risk a silent overwrite when BOTH sides changed since the last
 * sync — that case returns 'conflict' so the UI can ask the user.
 */

export type SyncAction = 'push' | 'pull' | 'conflict' | 'noop'

export interface SyncInputs {
  /** When the cloud snapshot was last written (ms), or null if none exists. */
  cloudUpdatedAt: number | null
  /** Newest local record change (ms), or null if unknown. */
  localModifiedAt: number | null
  /** Whether this device has any real data (tasks/lists/tags). */
  localHasData: boolean
  /** When this device last successfully synced with the cloud (ms), or null. */
  lastSyncedAt: number | null
  /**
   * Local change counter now, and its value at the last successful sync.
   * These catch deletions, which leave no timestamp behind and can make a
   * device that deliberately cleared its data look like a fresh install.
   */
  localRev?: number
  syncedLocalRev?: number | null
}

export function decideInitialSync(input: SyncInputs): SyncAction {
  const { cloudUpdatedAt, localModifiedAt, localHasData, lastSyncedAt } = input

  // Did anything change here since we last synced? A bumped counter catches
  // deletions that no updatedAt would reveal.
  const revMoved =
    input.localRev !== undefined &&
    input.syncedLocalRev !== undefined &&
    input.syncedLocalRev !== null &&
    input.localRev > input.syncedLocalRev

  // Nothing in the cloud yet: upload if we have something worth keeping.
  if (cloudUpdatedAt == null) {
    return localHasData || revMoved ? 'push' : 'noop'
  }

  // This device is empty. If it synced before and has since changed, that
  // emptiness is a deliberate deletion — pulling would resurrect the data.
  if (!localHasData) {
    if (revMoved) return 'conflict'
    return 'pull'
  }

  // Both sides have data. Use the last-synced watermark to tell who moved.
  if (lastSyncedAt != null) {
    const localChanged = (localModifiedAt ?? 0) > lastSyncedAt || revMoved
    const cloudChanged = cloudUpdatedAt > lastSyncedAt
    if (localChanged && cloudChanged) return 'conflict'
    if (cloudChanged) return 'pull'
    if (localChanged) return 'push'
    return 'noop'
  }

  // Never synced on this device, yet both sides have data — don't guess.
  return 'conflict'
}

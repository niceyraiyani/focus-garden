import { describe, it, expect } from 'vitest'
import { decideInitialSync } from './syncPolicy'

describe('decideInitialSync', () => {
  it('does nothing when both sides are empty', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: null, localModifiedAt: null, localHasData: false, lastSyncedAt: null }),
    ).toBe('noop')
  })

  it('pushes local data when the cloud is empty', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: null, localModifiedAt: 100, localHasData: true, lastSyncedAt: null }),
    ).toBe('push')
  })

  it('pulls when the cloud has data and this device is empty', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: 200, localModifiedAt: null, localHasData: false, lastSyncedAt: null }),
    ).toBe('pull')
  })

  it('treats both-have-data-but-never-synced as a conflict', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: 200, localModifiedAt: 150, localHasData: true, lastSyncedAt: null }),
    ).toBe('conflict')
  })

  it('pulls when only the cloud changed since last sync', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: 300, localModifiedAt: 100, localHasData: true, lastSyncedAt: 200 }),
    ).toBe('pull')
  })

  it('pushes when only this device changed since last sync', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: 200, localModifiedAt: 300, localHasData: true, lastSyncedAt: 200 }),
    ).toBe('push')
  })

  it('flags a conflict when both changed since last sync', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: 300, localModifiedAt: 320, localHasData: true, lastSyncedAt: 200 }),
    ).toBe('conflict')
  })

  it('does nothing when neither side changed since last sync', () => {
    expect(
      decideInitialSync({ cloudUpdatedAt: 200, localModifiedAt: 150, localHasData: true, lastSyncedAt: 200 }),
    ).toBe('noop')
  })
})

describe('decideInitialSync with a local change counter', () => {
  it('treats an emptied device as a conflict, not a fresh install', () => {
    // Synced, then deleted everything offline. Pulling would resurrect it.
    expect(
      decideInitialSync({
        cloudUpdatedAt: 200,
        localModifiedAt: null,
        localHasData: false,
        lastSyncedAt: 200,
        localRev: 7,
        syncedLocalRev: 5,
      }),
    ).toBe('conflict')
  })

  it('still pulls onto a genuinely new device', () => {
    expect(
      decideInitialSync({
        cloudUpdatedAt: 200,
        localModifiedAt: null,
        localHasData: false,
        lastSyncedAt: null,
        localRev: 0,
        syncedLocalRev: null,
      }),
    ).toBe('pull')
  })

  it('pushes a deletion when the cloud is empty', () => {
    expect(
      decideInitialSync({
        cloudUpdatedAt: null,
        localModifiedAt: null,
        localHasData: false,
        lastSyncedAt: 100,
        localRev: 4,
        syncedLocalRev: 2,
      }),
    ).toBe('push')
  })

  it('detects a local deletion that left other data behind', () => {
    // No timestamp moved, but the counter did: something was removed.
    expect(
      decideInitialSync({
        cloudUpdatedAt: 200,
        localModifiedAt: 150,
        localHasData: true,
        lastSyncedAt: 200,
        localRev: 9,
        syncedLocalRev: 8,
      }),
    ).toBe('push')
  })

  it('flags a conflict when the counter moved and the cloud did too', () => {
    expect(
      decideInitialSync({
        cloudUpdatedAt: 300,
        localModifiedAt: 150,
        localHasData: true,
        lastSyncedAt: 200,
        localRev: 9,
        syncedLocalRev: 8,
      }),
    ).toBe('conflict')
  })

  it('behaves as before when no counter is supplied', () => {
    expect(
      decideInitialSync({
        cloudUpdatedAt: 200,
        localModifiedAt: null,
        localHasData: false,
        lastSyncedAt: null,
      }),
    ).toBe('pull')
  })
})

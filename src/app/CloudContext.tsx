import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, resetSupabase } from '../data/cloud/client'
import {
  setCloudConfig,
  clearCloudConfig,
  isCloudConfigured,
  hasBuiltInConfig,
  hasOverride,
  getLastSyncedAt,
  setLastSyncedAt,
} from '../data/cloud/config'
import {
  installChangeHooks,
  subscribeLocalChanges,
  getCloudUpdatedAt,
  pushSnapshot,
  pullSnapshot,
  localHasData,
  localModifiedAt,
} from '../data/cloud/sync'
import { decideInitialSync } from '../data/cloud/syncPolicy'

export type SyncState = 'off' | 'syncing' | 'synced' | 'error' | 'conflict'

interface CloudUser {
  id: string
  email: string | null
}

interface CloudContextValue {
  configured: boolean
  /** True when this build ships its own project (no setup needed). */
  builtIn: boolean
  /** True when the user pointed this device at their own project. */
  usingOwnProject: boolean
  user: CloudUser | null
  syncState: SyncState
  lastSyncedAt: number | null
  error: string | null
  connect: (url: string, anonKey: string) => Promise<void>
  disconnect: () => Promise<void>
  signInPassword: (email: string, password: string) => Promise<void>
  signUpPassword: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  resolveConflict: (choice: 'cloud' | 'local') => Promise<void>
}

const CloudContext = createContext<CloudContextValue | null>(null)

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.'
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(isCloudConfigured())
  const [usingOwnProject, setUsingOwnProject] = useState(hasOverride())
  const [user, setUser] = useState<CloudUser | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('off')
  const [lastSyncedAt, setLast] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const userRef = useRef<CloudUser | null>(null)
  // Mirrors syncState so the change subscription (created once) can read the
  // current value instead of closing over a stale one.
  const syncStateRef = useRef<SyncState>('off')
  syncStateRef.current = syncState
  const syncedUsers = useRef<Set<string>>(new Set())
  const pushTimer = useRef<number | null>(null)

  function applyUser(u: User | null) {
    const mapped = u ? { id: u.id, email: u.email ?? null } : null
    userRef.current = mapped
    setUser(mapped)
  }

  async function runInitialSync(userId: string) {
    if (syncedUsers.current.has(userId)) return
    syncedUsers.current.add(userId)
    setSyncState('syncing')
    setError(null)
    try {
      const [cloudUpdatedAt, hasData, modAt] = await Promise.all([
        getCloudUpdatedAt(userId),
        localHasData(),
        localModifiedAt(),
      ])
      const action = decideInitialSync({
        cloudUpdatedAt,
        localModifiedAt: modAt,
        localHasData: hasData,
        lastSyncedAt: getLastSyncedAt(userId),
      })
      if (action === 'push') {
        const at = await pushSnapshot(userId)
        setLastSyncedAt(userId, at)
        setLast(at)
        setSyncState('synced')
      } else if (action === 'pull') {
        const at = (await pullSnapshot(userId)) ?? Date.now()
        setLastSyncedAt(userId, at)
        setLast(at)
        setSyncState('synced')
      } else if (action === 'conflict') {
        setSyncState('conflict')
      } else {
        const ms = getLastSyncedAt(userId)
        setLast(ms)
        setSyncState('synced')
      }
    } catch (e) {
      syncedUsers.current.delete(userId)
      setError(errMessage(e))
      setSyncState('error')
    }
  }

  async function pushNow() {
    const uid = userRef.current?.id
    if (!uid) return
    setSyncState('syncing')
    setError(null)
    try {
      const at = await pushSnapshot(uid)
      setLastSyncedAt(uid, at)
      setLast(at)
      setSyncState('synced')
    } catch (e) {
      setError(errMessage(e))
      setSyncState('error')
    }
  }

  // Wire the auth session + listener whenever we have a configured project.
  useEffect(() => {
    if (!configured) return
    const sb = getSupabase()
    if (!sb) return
    installChangeHooks()
    let active = true

    void sb.auth.getSession().then(({ data }) => {
      if (!active) return
      const u = data.session?.user ?? null
      applyUser(u)
      if (u) void runInitialSync(u.id)
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      applyUser(u)
      if (u) {
        void runInitialSync(u.id)
      } else {
        setSyncState('off')
        setLast(null)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  // Debounced auto-push after local edits while signed in.
  useEffect(() => {
    if (!configured) return
    const unsub = subscribeLocalChanges(() => {
      if (!userRef.current) return
      // Never push while the initial sync is still deciding, or while a
      // conflict is waiting on the user — either would overwrite the cloud
      // copy with data the user hasn't chosen to keep. The edit still lands
      // locally and will be pushed once the state settles.
      const state = syncStateRef.current
      if (state === 'syncing' || state === 'conflict') return
      if (pushTimer.current) clearTimeout(pushTimer.current)
      pushTimer.current = window.setTimeout(() => {
        if (syncStateRef.current === 'syncing' || syncStateRef.current === 'conflict') return
        void pushNow()
      }, 4000)
    })
    return () => {
      unsub()
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  const value = useMemo<CloudContextValue>(
    () => ({
      configured,
      builtIn: hasBuiltInConfig(),
      usingOwnProject,
      user,
      syncState,
      lastSyncedAt,
      error,
      async connect(url, anonKey) {
        setCloudConfig({ url, anonKey })
        resetSupabase()
        const sb = getSupabase()
        if (!sb) throw new Error('Could not start the cloud client — check the URL and key.')
        syncedUsers.current.clear()
        setUsingOwnProject(true)
        setConfigured(true)
      },
      async disconnect() {
        const sb = getSupabase()
        try {
          await sb?.auth.signOut()
        } catch {
          /* ignore */
        }
        clearCloudConfig()
        resetSupabase()
        syncedUsers.current.clear()
        applyUser(null)
        setUsingOwnProject(false)
        // Falling back to a built-in project means we're still configured.
        setConfigured(isCloudConfigured())
        setSyncState('off')
        setLast(null)
        setError(null)
      },
      async signInPassword(email, password) {
        const sb = getSupabase()
        if (!sb) throw new Error('Connect a project first.')
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
      },
      async signUpPassword(email, password) {
        const sb = getSupabase()
        if (!sb) throw new Error('Connect a project first.')
        const { data, error } = await sb.auth.signUp({ email, password })
        if (error) throw new Error(error.message)
        return { needsConfirmation: !data.session }
      },
      async signInGoogle() {
        const sb = getSupabase()
        if (!sb) throw new Error('Connect a project first.')
        const redirectTo = window.location.origin + import.meta.env.BASE_URL
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
        if (error) throw new Error(error.message)
      },
      async signOut() {
        const sb = getSupabase()
        await sb?.auth.signOut()
      },
      syncNow: pushNow,
      async resolveConflict(choice) {
        const uid = userRef.current?.id
        if (!uid) return
        setSyncState('syncing')
        setError(null)
        try {
          const ms = choice === 'cloud' ? (await pullSnapshot(uid)) ?? Date.now() : await pushSnapshot(uid)
          setLastSyncedAt(uid, ms)
          setLast(ms)
          setSyncState('synced')
        } catch (e) {
          setError(errMessage(e))
          setSyncState('error')
        }
      },
    }),
    [configured, usingOwnProject, user, syncState, lastSyncedAt, error],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext)
  if (!ctx) throw new Error('useCloud must be used within CloudProvider')
  return ctx
}

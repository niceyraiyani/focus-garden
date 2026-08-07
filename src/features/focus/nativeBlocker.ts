import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useActiveSession } from './useFocusSession'
import { useSettings } from '../../app/SettingsContext'

/**
 * Bridge to the native (Tauri desktop) hosts-file site blocker.
 *
 * On the desktop build these call into Rust commands that edit the system
 * hosts file. In a plain browser there is no Tauri runtime, so every function
 * safely no-ops — the web app keeps working, just without real blocking.
 */

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function startBlock(domains: string[]): Promise<void> {
  if (!isDesktop()) return
  await invoke('start_block', { domains })
}

export async function stopBlock(): Promise<void> {
  if (!isDesktop()) return
  await invoke('stop_block')
}

/**
 * Put the block back if it went missing. Returns whether it had to.
 *
 * Editing `/etc/hosts` back by hand is the obvious way around a blocker, and
 * it's the kind of thing that feels clever at minute forty and pointless
 * afterwards. Re-asserting means the block has to be beaten continuously
 * rather than once.
 */
export async function reassertBlock(domains: string[]): Promise<boolean> {
  if (!isDesktop()) return false
  return await invoke<boolean>('reassert_block', { domains })
}

/** How often to confirm the block is still in place, in ms. */
const INTEGRITY_INTERVAL = 15000

/** Normalize user input into a bare domain, e.g. "https://www.YouTube.com/x" -> "youtube.com". */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase()
  if (!d) return ''
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '')
  d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0]
  return d
}

/**
 * Turns hosts-file blocking on while a focus session is running and off when it
 * ends. Mount once near the app root. No-op on the web build.
 */
export function useNativeBlocker(): void {
  const session = useActiveSession()
  const { settings } = useSettings()
  const active = !!session
  const blocklist = settings.blocklist ?? []
  const key = blocklist.join(',')

  useEffect(() => {
    if (!isDesktop()) return
    if (!active) {
      // Always clear on a non-active session, not just when this mount saw one
      // start. If the app was killed mid-session the hosts file still carries
      // our block, and only an unconditional stop can release it.
      void stopBlock().catch((e) => console.error('stop_block failed:', e))
      return
    }

    void startBlock(blocklist).catch((e) => console.error('start_block failed:', e))

    // Keep checking while the session runs, so removing the block by hand only
    // buys a few seconds.
    const id = setInterval(() => {
      void reassertBlock(blocklist)
        .then((restored) => {
          if (restored) console.warn('lock.in: block was missing, restored it')
        })
        .catch((e) => console.error('reassert_block failed:', e))
    }, INTEGRITY_INTERVAL)
    return () => clearInterval(id)
    // Re-run when the session starts/stops or the blocklist changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])
}

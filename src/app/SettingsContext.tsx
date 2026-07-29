import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, ensureSeeded } from '../data/db'
import { updateSettings as persistSettings } from '../data/settings'
import type { Settings } from '../domain/types'

interface SettingsContextValue {
  settings: Settings
  /** Resolved theme actually applied ('light' | 'dark'). */
  resolvedTheme: 'light' | 'dark'
  update: (patch: Partial<Settings>) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  // Seed the settings row once, outside of any liveQuery (writes are not
  // allowed inside a liveQuery querier). Until it exists we fall back to
  // DEFAULT_SETTINGS below, so the UI renders immediately either way.
  useEffect(() => {
    void ensureSeeded()
  }, [])

  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const effective = settings ?? DEFAULT_SETTINGS

  const resolvedTheme: 'light' | 'dark' =
    effective.theme === 'system' ? (systemDark ? 'dark' : 'light') : effective.theme

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', resolvedTheme)
    root.setAttribute('data-motion', effective.decorativeMotion ? 'on' : 'off')
    root.setAttribute('data-accent', effective.accent ?? 'white')
    root.setAttribute('data-vibe', effective.vibe ?? 'flowers')
  }, [resolvedTheme, effective.decorativeMotion, effective.accent, effective.vibe])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: effective,
      resolvedTheme,
      update: (patch) => persistSettings(patch),
    }),
    [effective, resolvedTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

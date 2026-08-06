import { useEffect, useState } from 'react'
import { getCloudConfig } from './config'

/**
 * Which sign-in methods the connected project actually offers.
 *
 * Supabase happily renders an "authorize" URL for a disabled provider and then
 * answers it with raw JSON -- `{"msg":"Unsupported provider: provider is not
 * enabled"}` -- on its own domain. That navigation leaves the app entirely, so
 * there's no error we can catch and show; the only fix is not to offer a button
 * that can't work.
 *
 * GoTrue's /settings endpoint is public and lists the enabled providers, so we
 * ask before offering. It also means enabling Google in the Supabase dashboard
 * makes the button appear on next load, with no rebuild.
 */
export interface AuthProviders {
  google: boolean
  email: boolean
  /** False until the check resolves, so we don't flash buttons then remove them. */
  loaded: boolean
}

const UNKNOWN: AuthProviders = { google: false, email: true, loaded: false }

export function useAuthProviders(): AuthProviders {
  const [state, setState] = useState<AuthProviders>(UNKNOWN)

  useEffect(() => {
    const cfg = getCloudConfig()
    if (!cfg) {
      setState(UNKNOWN)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.anonKey } })
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as { external?: Record<string, boolean> }
        if (cancelled) return
        setState({
          google: json.external?.google === true,
          email: json.external?.email !== false,
          loaded: true,
        })
      } catch {
        // Offline or an old self-hosted GoTrue: fall back to email, which every
        // project has, rather than hiding sign-in altogether.
        if (!cancelled) setState({ google: false, email: true, loaded: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

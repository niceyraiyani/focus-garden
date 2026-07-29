import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCloudConfig } from './config'

/**
 * Lazily builds a Supabase client from the stored config, or returns null when
 * the user hasn't connected a project yet (the app then stays fully local).
 * The client is cached and only rebuilt when the config changes.
 */

let client: SupabaseClient | null = null
let cacheKey = ''

export function getSupabase(): SupabaseClient | null {
  const cfg = getCloudConfig()
  if (!cfg) {
    client = null
    cacheKey = ''
    return null
  }
  const key = `${cfg.url}|${cfg.anonKey}`
  if (client && cacheKey === key) return client
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // PKCE returns the session via a ?code= query param instead of the URL
      // hash, so it doesn't collide with our HashRouter (#/route) URLs.
      flowType: 'pkce',
      storageKey: 'lockin.cloud.auth',
    },
  })
  cacheKey = key
  return client
}

export function resetSupabase(): void {
  client = null
  cacheKey = ''
}

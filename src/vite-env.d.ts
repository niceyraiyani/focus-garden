/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project baked into the build so sign-in needs no setup. */
  readonly VITE_SUPABASE_URL?: string
  /** Public anon key — safe to ship; row-level security does the protecting. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

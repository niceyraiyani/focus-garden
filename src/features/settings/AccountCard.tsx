import { useState } from 'react'
import { useCloud } from '../../app/CloudContext'
import { useAuthProviders } from '../../data/cloud/useAuthProviders'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/ToastContext'

function formatWhen(ms: number | null): string {
  if (!ms) return 'not yet'
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`
  return new Date(ms).toLocaleString()
}

/** Sign-in + cloud sync controls. Everything stays local until you connect. */
export function AccountCard() {
  const cloud = useCloud()
  const { toast } = useToast()
  const providers = useAuthProviders()

  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [busy, setBusy] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // ---- Not connected to a project yet: one-time setup ----
  if (!cloud.configured) {
    return (
      <div className="card setting-block">
        <h3 className="group-title">
          <Icon name="cloud" className="view-icon" /> Account &amp; cloud sync
        </h3>
        <p className="setting-hint">
          Right now everything is saved only in this browser. Connect a free Supabase project to sign in
          and sync your tasks across devices. It stays free for personal use, and your data lives in
          <em> your own</em> project — not mine.
        </p>
        <Button variant="ghost" onClick={() => setShowSetup((s) => !s)}>
          <Icon name={showSetup ? 'arrow-up' : 'arrow-down'} /> {showSetup ? 'Hide' : 'Set up sync'}
        </Button>
        {showSetup && (
          <div className="cloud-setup">
            <ol className="cloud-steps">
              <li>
                Create a free project at{' '}
                <a href="https://supabase.com" target="_blank" rel="noreferrer">
                  supabase.com
                </a>
                .
              </li>
              <li>
                In the SQL editor, run the setup snippet from{' '}
                <a
                  href="https://github.com/niceyraiyani/lock.in/blob/main/docs/CLOUD_SYNC.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  docs/CLOUD_SYNC.md
                </a>
                .
              </li>
              <li>Paste your Project URL and publishable (or anon) key below.</li>
            </ol>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              aria-label="Supabase project URL"
            />
            <input
              className="input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sb_publishable_… or anon key"
              aria-label="Supabase publishable or anon key"
            />
            <Button
              variant="primary"
              disabled={!url.trim() || !key.trim() || busy}
              onClick={() => run(() => cloud.connect(url, key))}
            >
              <Icon name="check" /> Connect
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ---- Connected but signed out: sign in / create account ----
  if (!cloud.user) {
    return (
      <div className="card setting-block">
        <h3 className="group-title">
          <Icon name="cloud" className="view-icon" /> Account &amp; cloud sync
        </h3>
        <p className="setting-hint">Sign in to sync your tasks across every device.</p>
        {providers.google && (
          <Button variant="primary" disabled={busy} onClick={() => run(() => cloud.signInGoogle())}>
            <Icon name="sparkle" /> Continue with Google
          </Button>
        )}
        {providers.google && <p className="setting-hint cloud-or">or use an email &amp; password</p>}
        <div className="cloud-setup">
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email"
          />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            aria-label="Password"
          />
          <div className="setting-actions">
            <Button
              variant="primary"
              disabled={!email.trim() || !password || busy}
              onClick={() =>
                run(async () => {
                  if (mode === 'signin') {
                    await cloud.signInPassword(email, password)
                  } else {
                    const { needsConfirmation } = await cloud.signUpPassword(email, password)
                    toast(needsConfirmation ? 'Check your email to confirm your account.' : 'Account created!')
                  }
                  setPassword('')
                })
              }
            >
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            <Button variant="ghost" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
            </Button>
          </div>
        </div>

        {cloud.usingOwnProject ? (
          <Button variant="ghost" disabled={busy} onClick={() => run(() => cloud.disconnect())}>
            Use the default project instead
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setShowSetup((s) => !s)}>
              <Icon name={showSetup ? 'arrow-up' : 'arrow-down'} /> Use my own Supabase project
            </Button>
            {showSetup && (
              <div className="cloud-setup">
                <p className="setting-hint">
                  Optional — point this device at a project you own instead. See{' '}
                  <a
                    href="https://github.com/niceyraiyani/lock.in/blob/main/docs/CLOUD_SYNC.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    docs/CLOUD_SYNC.md
                  </a>
                  .
                </p>
                <input
                  className="input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  aria-label="Supabase project URL"
                />
                <input
                  className="input"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sb_publishable_… or anon key"
                  aria-label="Supabase publishable or anon key"
                />
                <Button
                  variant="primary"
                  disabled={!url.trim() || !key.trim() || busy}
                  onClick={() => run(() => cloud.connect(url, key))}
                >
                  <Icon name="check" /> Connect
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ---- Signed in ----
  const stateLabel: Record<string, string> = {
    off: 'Local only',
    syncing: 'Syncing…',
    synced: `Synced ${formatWhen(cloud.lastSyncedAt)}`,
    error: cloud.error ?? 'Sync error',
    conflict: 'Needs your choice',
  }

  return (
    <div className="card setting-block setting-block--accent">
      <h3 className="group-title">
        <Icon name="cloud" className="view-icon" /> Account &amp; cloud sync
      </h3>
      <div className="setting-row">
        <span className="toggle-label">
          {cloud.user.email ?? 'Signed in'}
          <small>{stateLabel[cloud.syncState]}</small>
        </span>
        <Button variant="ghost" disabled={busy} onClick={() => run(() => cloud.signOut())}>
          Sign out
        </Button>
      </div>

      {cloud.syncState === 'conflict' && (
        <div className="cloud-conflict">
          <p className="setting-hint">
            This device and the cloud both changed since they last synced. Which one should win?
          </p>
          <div className="setting-actions">
            <Button variant="primary" disabled={busy} onClick={() => run(() => cloud.resolveConflict('cloud'))}>
              <Icon name="download" /> Use cloud version
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => run(() => cloud.resolveConflict('local'))}>
              <Icon name="upload" /> Use this device
            </Button>
          </div>
        </div>
      )}

      <div className="setting-actions">
        <Button variant="ghost" disabled={busy || cloud.syncState === 'syncing'} onClick={() => run(cloud.syncNow)}>
          <Icon name="refresh" /> Sync now
        </Button>
      </div>
      <p className="setting-hint">Changes sync automatically a few seconds after you make them.</p>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useSettings } from '../../app/SettingsContext'
import { downloadBackup, importBackup } from '../../data/backup'
import { normalizeDomain, isDesktop } from '../focus/nativeBlocker'
import { Button } from '../../components/Button'
import { useToast } from '../../components/ToastContext'
import { useConfirm } from '../../components/ConfirmContext'
import type { ThemeMode, Weekday } from '../../domain/types'

const WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
]

const THEMES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'system', label: 'System', icon: '🖥' },
  { mode: 'light', label: 'Light', icon: '☀️' },
  { mode: 'dark', label: 'Dark', icon: '🌙' },
]

const GOAL_CHOICES = [30, 60, 90, 120, 180, 240]
const MIN_CHOICES = [15, 25, 30, 45, 60]

export function SettingsPage() {
  const { settings, update } = useSettings()
  const { toast } = useToast()
  const confirm = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [newSite, setNewSite] = useState('')

  const blocklist = settings.blocklist ?? []
  const desktop = isDesktop()

  function addSite() {
    const domain = normalizeDomain(newSite)
    if (!domain) return
    if (blocklist.includes(domain)) {
      setNewSite('')
      return
    }
    void update({ blocklist: [...blocklist, domain] })
    setNewSite('')
  }

  function removeSite(domain: string) {
    void update({ blocklist: blocklist.filter((d) => d !== domain) })
  }

  function toggleWorkday(day: Weekday) {
    const has = settings.workdays.includes(day)
    const next = has ? settings.workdays.filter((d) => d !== day) : [...settings.workdays, day]
    void update({ workdays: next.sort() })
  }

  async function enableNotifications(on: boolean) {
    if (on && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    void update({ notificationsEnabled: on })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ok = await confirm({
      title: 'Restore from backup?',
      message: 'This replaces all current data on this device with the backup contents. This cannot be undone.',
      confirmLabel: 'Replace everything',
      danger: true,
    })
    if (!ok) {
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      await importBackup(text)
      toast('Backup restored 🌿')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not import that file.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="settings">
      <header className="view-header">
        <h1 className="view-title">
          <span className="view-icon">⚙️</span>Settings
        </h1>
      </header>

      <div className="card setting-block">
        <h3 className="group-title">Appearance</h3>
        <div className="setting-row">
          <span>Theme</span>
          <div className="seg">
            {THEMES.map((t) => (
              <button
                key={t.mode}
                className={`seg-item ${settings.theme === t.mode ? 'seg-item--on' : ''}`}
                onClick={() => update({ theme: t.mode })}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <ToggleRow
          label="Gentle motion"
          hint="Drifting flowers, bounces, and floating details."
          value={settings.decorativeMotion}
          onChange={(v) => update({ decorativeMotion: v })}
        />
        <ToggleRow
          label="Completion celebrations"
          hint="Little petal bursts when you finish a task."
          value={settings.celebrations}
          onChange={(v) => update({ celebrations: v })}
        />
        <ToggleRow
          label="Focus companion"
          hint="A tiny friend that keeps you company while you work."
          value={settings.showCompanion}
          onChange={(v) => update({ showCompanion: v })}
        />
      </div>

      <div className="card setting-block">
        <h3 className="group-title">Focus</h3>
        <div className="setting-row">
          <span>Default minimum</span>
          <div className="seg">
            {MIN_CHOICES.map((m) => (
              <button
                key={m}
                className={`seg-item ${settings.defaultMinMinutes === m ? 'seg-item--on' : ''}`}
                onClick={() => update({ defaultMinMinutes: m })}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <ToggleRow
          label="Nudge notifications"
          hint="A gentle browser notification when you reach your minimum."
          value={settings.notificationsEnabled}
          onChange={enableNotifications}
        />
      </div>

      <div className="card setting-block">
        <h3 className="group-title">Goals &amp; streaks</h3>
        <div className="setting-row">
          <span>Daily focus goal</span>
          <div className="seg">
            {GOAL_CHOICES.map((g) => (
              <button
                key={g}
                className={`seg-item ${settings.dailyGoalMinutes === g ? 'seg-item--on' : ''}`}
                onClick={() => update({ dailyGoalMinutes: g })}
              >
                {g < 60 ? `${g}m` : `${g / 60}h`}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row setting-row--col">
          <span>Workdays</span>
          <div className="seg workday-seg">
            {WEEKDAYS.map((w) => (
              <button
                key={w.day}
                className={`seg-item ${settings.workdays.includes(w.day) ? 'seg-item--on' : ''}`}
                onClick={() => toggleWorkday(w.day)}
              >
                {w.label}
              </button>
            ))}
          </div>
          <p className="setting-hint">Only these days count toward goals and streaks. Rest days are always guilt-free.</p>
        </div>
      </div>

      <div className="card setting-block">
        <h3 className="group-title">Focus site blocker</h3>
        <p className="setting-hint">
          {desktop
            ? 'These sites are blocked while a focus session is running, and work normally when it’s off. The app needs administrator/root permission to change blocking.'
            : 'These sites will be blocked while a focus session runs — but only in the desktop app, which can edit your computer’s hosts file. In this browser tab the list is saved but not enforced. See the README to build the desktop app.'}
        </p>
        <div className="setting-actions">
          <input
            className="input"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSite()}
            placeholder="e.g. youtube.com"
            aria-label="Add a site to block"
          />
          <Button variant="primary" onClick={addSite} disabled={!newSite.trim()}>
            ＋ Block site
          </Button>
        </div>
        {blocklist.length === 0 ? (
          <p className="setting-hint">No sites blocked yet.</p>
        ) : (
          <div className="tag-row">
            {blocklist.map((d) => (
              <span key={d} className="chip">
                🚫 {d}
                <button className="chip-x" aria-label={`Stop blocking ${d}`} onClick={() => removeSite(d)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {!desktop && blocklist.length > 0 && (
          <p className="setting-hint">🖥️ Open focus garden in the desktop app to actually block these.</p>
        )}
      </div>

      <div className="card setting-block">
        <h3 className="group-title">Your data</h3>
        <p className="setting-hint">
          Everything lives privately in this browser on this device, tied to this exact web address — no
          account, no cloud, no tracking. Data on the local dev version and the hosted version are separate;
          use Export/Import to move between them. Clearing site data erases it, so back up now and then.
        </p>
        <div className="setting-actions">
          <Button variant="primary" onClick={() => downloadBackup()}>
            ⬇ Export backup
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
            ⬆ Restore backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
        </div>
      </div>

      <p className="settings-foot">Made with 🌸 for calmer, kinder productivity.</p>
    </section>
  )
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="setting-row">
      <span className="toggle-label">
        {label}
        <small>{hint}</small>
      </span>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`switch ${value ? 'switch--on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  )
}

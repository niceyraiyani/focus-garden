import { useRef, useState } from 'react'
import { useSettings } from '../../app/SettingsContext'
import { downloadBackup, importBackup } from '../../data/backup'
import { isDesktop } from '../focus/nativeBlocker'
import { BlocklistEditor } from '../focus/BlocklistEditor'
import { AccountCard } from './AccountCard'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import type { IconName } from '../../components/Icon'
import { useToast } from '../../components/ToastContext'
import { useConfirm } from '../../components/ConfirmContext'
import { requestNotificationPermission, enableBackgroundNudge } from '../../lib/notify'
import type { ThemeMode, Weekday, AccentName, Vibe } from '../../domain/types'
import { VIBE_DEFAULT_ACCENT, resolveAccent } from '../../theme/accents'

const WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
]

const THEMES: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'system', label: 'System', icon: 'monitor' },
  { mode: 'light', label: 'Light', icon: 'sun' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
]

const ACCENTS: { name: AccentName; label: string; swatch: string }[] = [
  { name: 'white', label: 'Paper', swatch: '#eceae3' },
  // Stored ids stay as they were so existing settings keep working; only the
  // labels and colours changed with the new palette.
  { name: 'blush', label: 'Petal', swatch: '#e6adb6' },
  { name: 'amber', label: 'Amber', swatch: '#e6c58c' },
  { name: 'mint', label: 'Sage', swatch: '#a6ccac' },
  { name: 'sky', label: 'Sky', swatch: '#a3c4e8' },
  { name: 'lavender', label: 'Lavender', swatch: '#c1b1e6' },
]

const VIBES: { name: Vibe; label: string; hint: string }[] = [
  { name: 'plain', label: 'Plain', hint: 'clean graphite' },
  { name: 'flowers', label: 'Flowers', hint: 'warm cocoa + wildflowers' },
  { name: 'robot', label: 'Robot', hint: 'cool slate-teal' },
]

const GOAL_CHOICES = [30, 60, 90, 120, 180, 240]
const MIN_CHOICES = [15, 25, 30, 45, 60]

export function SettingsPage() {
  const { settings, update } = useSettings()
  const { toast } = useToast()
  const confirm = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const desktop = isDesktop()

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

  async function enableDailyNudge(on: boolean) {
    if (on && !(await requestNotificationPermission())) return
    if (on) void enableBackgroundNudge()
    void update({ dailyNudge: on })
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
      toast('Backup restored')
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
          <Icon name="gear" className="view-icon" />Settings
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
                <Icon name={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row setting-row--col">
          <span>Vibe</span>
          <div className="seg vibe-seg">
            {VIBES.map((v) => (
              <button
                key={v.name}
                className={`seg-item ${(settings.vibe ?? 'flowers') === v.name ? 'seg-item--on' : ''}`}
                onClick={() => update({ vibe: v.name, accent: VIBE_DEFAULT_ACCENT[v.name] })}
                title={v.hint}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="setting-hint">
            {VIBES.find((v) => v.name === (settings.vibe ?? 'flowers'))?.hint}
          </p>
        </div>
        <div className="setting-row setting-row--col">
          <span>Accent color</span>
          <div className="accent-picker">
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                className={`accent-choice ${resolveAccent(settings.accent, settings.vibe) === a.name ? 'accent-choice--on' : ''}`}
                onClick={() => update({ accent: a.name })}
                title={`${a.label} · ${a.swatch}`}
                aria-label={a.label}
              >
                <span className="accent-swatch" style={{ background: a.swatch }} />
                <span className="accent-label">{a.label}</span>
              </button>
            ))}
          </div>
          <p className="setting-hint">
            Picking a vibe auto-matches its accent — switch it anytime.
          </p>
        </div>
        <ToggleRow
          label="Retro chrome"
          hint="Window title bars, chunky outlines, and hard drop shadows."
          value={settings.retro ?? true}
          onChange={(v) => update({ retro: v })}
        />
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
        <ToggleRow
          label="Daily reminder"
          hint="One nudge a day if you haven’t started yet. Stays quiet once you’re working."
          value={settings.dailyNudge ?? false}
          onChange={enableDailyNudge}
        />
        {(settings.dailyNudge ?? false) && (
          <div className="setting-row">
            <span>Remind me at</span>
            <input
              type="time"
              className="input input--sm setting-time"
              value={settings.dailyNudgeAt ?? '09:00'}
              onChange={(e) => update({ dailyNudgeAt: e.target.value })}
            />
          </div>
        )}
        <p className="setting-hint">
          Reminders show up in your system notifications. Install lock.in (or use the desktop app) and they can
          arrive with it closed — in a plain browser tab they only fire while it’s open.
        </p>
      </div>

      {/* Desktop only — a browser tab can't edit the hosts file, so offering
          the setting on the web would be pure decoration. */}
      {desktop && (
        <div className="card setting-block setting-block--accent">
          <h3 className="group-title">
            <Icon name="ban" className="view-icon" /> Focus site blocker
          </h3>
          <p className="setting-hint">
            These sites are blocked while a focus session is running, and work normally when it’s off. The app needs
            administrator/root permission to change blocking.
          </p>
          <BlocklistEditor />
        </div>
      )}

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

      <AccountCard />

      <div className="card setting-block">
        <h3 className="group-title">Your data</h3>
        <p className="setting-hint">
          Everything lives privately in this browser on this device, tied to this exact web address — no
          account, no cloud, no tracking. Data on the local dev version and the hosted version are separate;
          use Export/Import to move between them. Clearing site data erases it, so back up now and then.
        </p>
        <div className="setting-actions">
          <Button variant="primary" onClick={() => downloadBackup()}>
            <Icon name="download" /> Export backup
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Icon name="upload" /> Restore backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
        </div>
      </div>

      <p className="settings-foot">Made with care for calmer, kinder productivity.</p>
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

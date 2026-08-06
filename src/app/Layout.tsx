import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { useActiveLists } from '../features/tasks/hooks'
import { createList } from '../data/lists'
import { useActiveSession, useNow } from '../features/focus/useFocusSession'
import { useNativeBlocker } from '../features/focus/nativeBlocker'
import { useSessionPresence } from '../features/focus/useSessionPresence'
import { useDailyNudge } from '../features/focus/useDailyNudge'
import { todayFocusedMs, currentStreak, weekComparison } from '../features/insights/aggregations'
import { useSettings } from './SettingsContext'
import { formatMinutes } from '../lib/time'
import { Icon, ListGlyph } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { DecorBackground } from '../components/DecorBackground'
import { CommandPalette, openCommandPalette } from '../components/CommandPalette'

function NavItem({ to, icon, label, end }: { to: string; icon: IconName; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--on' : ''}`}>
      <Icon name={icon} className="nav-icon" />
      <span>{label}</span>
    </NavLink>
  )
}

export function Layout() {
  const lists = useActiveLists()
  const session = useActiveSession()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  // Desktop app only: block distracting sites while a session runs.
  useNativeBlocker()

  // Keep session time tied to actually being here.
  useSessionPresence()

  // One gentle "what are you locking in on?" a day.
  useDailyNudge()

  // Today's focused time, visible from every page.
  const segments = useLiveQuery(() => db.segments.toArray(), [], [])
  const nowTs = useNow(session?.status === 'running', 15000)
  const todayMs = todayFocusedMs(segments, nowTs)
  const streak = currentStreak(segments, settings)
  const { thisWeekMs } = weekComparison(segments)

  async function addList() {
    const trimmed = name.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    const list = await createList(trimmed)
    setName('')
    setAdding(false)
    navigate(`/list/${list.id}`)
  }

  return (
    <div className="app-shell">
      <DecorBackground />
      <aside className="sidebar">
        <div className="brand">
          <Icon name="lock" className="brand-mark" />
          <span className="brand-name">lock.in</span>
        </div>

        <button className="sidebar-search" onClick={openCommandPalette}>
          <Icon name="search" />
          <span>Search or capture</span>
          <kbd>⌘K</kbd>
        </button>

        <nav className="nav">
          <NavItem to="/" icon="sun" label="Today" end />
          <NavItem to="/inbox" icon="inbox" label="Inbox" />
          <NavItem to="/lists" icon="folder" label="Lists" />
          <NavItem to="/calendar" icon="calendar" label="Calendar" />
          <NavItem to="/all" icon="flower" label="All tasks" />
          <NavItem to="/insights" icon="chart" label="Insights" />
          <NavItem to="/completed" icon="trophy" label="Completed" />
        </nav>

        <div className="nav-section">
          <div className="nav-section-head">
            <Link to="/lists" className="nav-section-link">
              Lists
            </Link>
            <button className="icon-btn icon-btn--tiny" aria-label="New list" onClick={() => setAdding(true)}>
              <Icon name="plus" />
            </button>
          </div>
          <nav className="nav">
            {lists.map((l) => (
              <NavLink
                key={l.id}
                to={`/list/${l.id}`}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item--on' : ''}`}
              >
                <ListGlyph icon={l.icon} className="nav-icon" />
                <span className="nav-list-name">{l.name}</span>
                <span className="chip-dot" style={{ background: l.color }} />
              </NavLink>
            ))}
            {adding && (
              <input
                className="input input--sm"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={addList}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addList()
                  if (e.key === 'Escape') {
                    setName('')
                    setAdding(false)
                  }
                }}
                placeholder="List name…"
              />
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <NavLink to="/focus" className={({ isActive }) => `focus-cta ${isActive ? 'focus-cta--on' : ''}`}>
            <Icon name="target" />
            <span>Focus</span>
            {session && <span className="focus-live" aria-label="Session in progress" />}
          </NavLink>
          <Link to="/insights" className="tally-card" aria-label="See your insights">
            <span className="tally-stat">
              <strong>{todayMs > 0 ? formatMinutes(todayMs / 60000) : '0m'}</strong>
              <small>today</small>
            </span>
            <span className="tally-split" aria-hidden="true" />
            {streak > 0 ? (
              <span className="tally-stat">
                <strong>{streak}</strong>
                <small>day streak</small>
              </span>
            ) : (
              /* A bare "0 day streak" is a daily little telling-off. Show the
                 week's total instead — almost always a number worth seeing. */
              <span className="tally-stat">
                <strong>{formatMinutes(thisWeekMs / 60000)}</strong>
                <small>this week</small>
              </span>
            )}
          </Link>
          <div className="nav">
            <NavItem to="/settings" icon="gear" label="Settings" />
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}

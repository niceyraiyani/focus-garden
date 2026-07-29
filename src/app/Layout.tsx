import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useActiveLists } from '../features/tasks/hooks'
import { createList } from '../data/lists'
import { useActiveSession } from '../features/focus/useFocusSession'
import { useNativeBlocker } from '../features/focus/nativeBlocker'
import { Flourish } from '../components/Flourish'
import { Icon, ListGlyph } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { DecorBackground } from '../components/DecorBackground'

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
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  // Desktop app only: block distracting sites while a session runs.
  useNativeBlocker()

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
          <Flourish variant="bloom" size={30} color="var(--accent-pink)" />
          <span className="brand-name">lock.in</span>
        </div>

        <nav className="nav">
          <NavItem to="/" icon="sun" label="Today" end />
          <NavItem to="/inbox" icon="inbox" label="Inbox" />
          <NavItem to="/calendar" icon="calendar" label="Calendar" />
          <NavItem to="/all" icon="flower" label="All tasks" />
          <NavItem to="/completed" icon="trophy" label="Completed" />
        </nav>

        <div className="nav-section">
          <div className="nav-section-head">
            <span>Lists</span>
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
          <div className="nav">
            <NavItem to="/insights" icon="chart" label="Insights" />
            <NavItem to="/settings" icon="gear" label="Settings" />
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

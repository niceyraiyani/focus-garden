import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useSettings } from '../../app/SettingsContext'
import { useTodayTasks } from '../tasks/hooks'
import { useActiveSession } from '../focus/useFocusSession'
import { startSession } from '../../data/sessions'
import { focusHeatmap, todayFocusedMs } from '../insights/aggregations'
import { FocusHeatmap } from '../../components/FocusHeatmap'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/ToastContext'
import { formatMinutes } from '../../lib/time'
import { QuickLinks } from './QuickLinks'
import { QuickAdd } from '../tasks/QuickAdd'

/**
 * The page you land on when you open the browser.
 *
 * The point isn't to be a dashboard. Habits fire from context, not intention —
 * so this exists to sit where "I'm about to work" already happens and make the
 * next move a single click, before there's room to drift.
 *
 * Which is also why it's deliberately sparse: every extra thing here is another
 * chance to tidy the tool instead of doing the work.
 */
export function LaunchPage() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const { toast } = useToast()
  const session = useActiveSession()
  const todayTasks = useTodayTasks()
  const segments = useLiveQuery(() => db.segments.toArray(), [], [])
  const [now, setNow] = useState(() => new Date())
  const [starting, setStarting] = useState(false)

  // Ticks the clock. Twenty seconds is plenty — this is a wall clock, not a
  // stopwatch, and a per-second re-render would be pure waste.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(id)
  }, [])

  const heat = useMemo(() => focusHeatmap(segments, settings), [segments, settings])
  const todayMs = todayFocusedMs(segments)

  // What you told yourself you'd do next, else the most pressing thing due.
  const work = todayTasks.filter((t) => !t.routine)
  const firstUp = settings.nextUp?.trim() || work[0]?.title || null

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  async function lockIn() {
    if (starting) return
    if (session) {
      navigate('/focus')
      return
    }
    setStarting(true)
    try {
      // Queue what's already in front of you rather than asking again. Picking
      // tasks is a decision, and decisions are where starting goes to die.
      const queue = work.slice(0, 3).map((t) => t.id)
      await startSession(queue, settings.defaultMinMinutes)
      navigate('/focus')
    } catch (e) {
      setStarting(false)
      toast(e instanceof Error ? e.message : 'Could not start the session.')
    }
  }

  return (
    <div className="launch">
      <div className="launch-inner">
        <header className="launch-clock">
          <div className="launch-time">{time}</div>
          <div className="launch-date">{date}</div>
        </header>

        <button className="launch-go" onClick={lockIn} disabled={starting}>
          <Icon name="target" />
          <span>{session ? 'Back to your session' : 'Lock in'}</span>
          {todayMs > 0 && <span className="launch-go-note">{formatMinutes(todayMs / 60000)} today</span>}
        </button>

        {firstUp && !session && (
          <p className="launch-next">
            <span className="launch-next-label">first up</span> {firstUp}
          </p>
        )}

        <QuickLinks links={settings.quickLinks ?? []} />

        {/* The other half of the loop: get it out of your head so it stops
            taking up room, without leaving this page or losing the thread. */}
        <div className="launch-capture">
          <QuickAdd listId={null} placeholder="Brain dump…" />
        </div>

        <section className="launch-heat">
          <FocusHeatmap map={heat} scrollToEnd />
        </section>

        <nav className="launch-nav">
          <Link to="/">Today</Link>
          <Link to="/inbox">Inbox</Link>
          <Link to="/lists">Lists</Link>
          <Link to="/insights">Insights</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </div>
    </div>
  )
}

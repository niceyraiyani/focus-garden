import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useSettings } from '../../app/SettingsContext'
import { useTodayTasks, useLists, useTags, useInboxTasks } from '../tasks/hooks'
import { useActiveSession, useNow } from '../focus/useFocusSession'
import { TaskRow } from '../tasks/TaskRow'
import { QuickAdd } from '../tasks/QuickAdd'
import { TaskDetailDialog } from '../tasks/TaskDetailDialog'
import { Flourish } from '../../components/Flourish'
import { Burst } from '../../components/Burst'
import { Icon, greetingIconFor } from '../../components/Icon'
import { WeekStrip } from '../../components/WeekStrip'
import { InboxTriage } from './InboxTriage'
import { todayFocusedMs, currentStreak, weekBars } from '../insights/aggregations'
import { rollOverdueToToday, restoreDueDates } from '../../data/tasks'
import { localDateKey } from '../../lib/date'
import { useToast } from '../../components/ToastContext'
import { formatMinutes } from '../../lib/time'
import { useState } from 'react'
import type { Task } from '../../domain/types'

export function HomePage() {
  const { settings } = useSettings()
  const todayTasks = useTodayTasks()
  const inbox = useInboxTasks()
  const lists = useLists()
  const tags = useTags()
  const session = useActiveSession()
  const segments = useLiveQuery(() => db.segments.toArray(), [], [])
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [playBurst, setPlayBurst] = useState(0)
  const navigate = useNavigate()
  const { toast } = useToast()

  // Ticks while a session runs so today's number climbs as you focus.
  const nowTs = useNow(session?.status === 'running', 15000)

  function onPlay(e: React.MouseEvent) {
    if (settings.celebrations && settings.decorativeMotion) {
      e.preventDefault()
      setPlayBurst((b) => b + 1)
      window.setTimeout(() => navigate('/focus'), 420)
    }
  }

  const focusedMs = todayFocusedMs(segments, nowTs)
  const goalMs = settings.dailyGoalMinutes * 60000
  const goalPct = Math.min(100, goalMs > 0 ? (focusedMs / goalMs) * 100 : 0)
  const streak = currentStreak(segments, settings)
  const bars = weekBars(segments, settings, nowTs)

  // Undated Inbox tasks — the ones that quietly pile up and get forgotten.
  const looseInbox = inbox.filter((t) => !t.dueDate)

  // Past-due tasks. Once there are a few, the list stops being useful and
  // starts being something you avoid — so offer a one-click reset.
  const today = localDateKey()
  const overdue = todayTasks.filter((t) => t.dueDate !== null && t.dueDate < today)

  async function rollOverdue() {
    const moved = await rollOverdueToToday()
    if (moved.length === 0) return
    toast(`Moved ${moved.length} ${moved.length === 1 ? 'task' : 'tasks'} to today. Fresh start.`, {
      label: 'Undo',
      onClick: () => restoreDueDates(moved),
    })
  }

  const openTaskLive = openTask ? todayTasks.find((t) => t.id === openTask.id) ?? openTask : null

  return (
    <section className="home">
      <div className="home-hero">
        <div>
          <h1 className="home-greeting">
            Lock in <Icon name={greetingIconFor(settings.vibe)} className="wave" />
          </h1>
          <p className="home-sub">
            {focusedMs > 0
              ? `You've focused for ${formatMinutes(focusedMs / 60000)} today.`
              : 'Pick one thing to start.'}
          </p>
        </div>
      </div>

      <div className="home-stats">
        <div className="card home-progress">
          <div className="home-progress-head">
            <span className="field-label">Today’s focus goal</span>
            <span className="home-progress-val">
              {formatMinutes(focusedMs / 60000)} / {formatMinutes(settings.dailyGoalMinutes)}
            </span>
          </div>
          <div className="timer-bar timer-bar--lg">
            <div className="timer-bar-fill" style={{ width: `${goalPct}%` }} />
          </div>
          <WeekStrip bars={bars} />
          <div className="home-progress-foot">
            <span>
              {streak > 0 ? (
                <>
                  {streak} <Icon name="flame" /> workday streak
                </>
              ) : (
                'Start a streak today!'
              )}
            </span>
            {goalPct >= 100 && <span className="goal-met">Goal met</span>}
          </div>
        </div>

        <Link to="/focus" className="card focus-hero" onClick={onPlay}>
          <Burst trigger={playBurst} variant="flower" />
          <span className="focus-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
          <span className="focus-hero-text">
            <span className="focus-hero-title">
              {session ? 'Resume your session' : 'Start a focus session'}
            </span>
            <span className="focus-hero-sub">
              {session ? 'Your timer is waiting' : 'Pick a few tasks and find your flow'}
            </span>
          </span>
          {session && <span className="focus-live-dot" aria-label="Session in progress" />}
        </Link>
      </div>

      <InboxTriage tasks={looseInbox} lists={lists} tags={tags} />

      <section className="home-tasks">
        <div className="home-col">
          <div className="col-head">
            <h2 className="group-title">
              <Icon name="calendar" /> Due today &amp; overdue
            </h2>
            {overdue.length > 1 && (
              <button className="group-title-action" onClick={rollOverdue}>
                move {overdue.length} overdue to today
              </button>
            )}
          </div>
          {todayTasks.length === 0 ? (
            <div className="empty empty--sm">
              <Flourish variant="bloom" size={48} float />
              <p>Nothing due today. Enjoy the calm.</p>
            </div>
          ) : (
            <div className="task-list">
              {todayTasks.map((t) => (
                <TaskRow key={t.id} task={t} lists={lists} tags={tags} onOpen={setOpenTask} showList />
              ))}
            </div>
          )}
        </div>

        <div className="home-col">
          <h2 className="group-title"><Icon name="inbox" /> Quick capture</h2>
          <QuickAdd listId={null} placeholder="Brain dump…" />
          <p className="muted-note home-inbox-count">
            {inbox.length === 0 ? 'Inbox is empty' : `${inbox.length} in your Inbox`}
            {inbox.length > 0 && (
              <>
                {' · '}
                <Link to="/inbox">organize →</Link>
              </>
            )}
          </p>
        </div>
      </section>

      {openTaskLive && (
        <TaskDetailDialog task={openTaskLive} lists={lists} tags={tags} onClose={() => setOpenTask(null)} />
      )}
    </section>
  )
}

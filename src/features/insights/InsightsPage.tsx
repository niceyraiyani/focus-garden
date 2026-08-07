import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useSettings } from '../../app/SettingsContext'
import {
  dailyStats,
  todayFocusedMs,
  currentStreak,
  weekComparison,
  focusedMsByList,
  summarizeSessions,
  focusHeatmap,
} from './aggregations'
import { formatMinutes } from '../../lib/time'
import { buildObservations } from './observations'
import { Icon } from '../../components/Icon'
import { FocusHeatmap } from '../../components/FocusHeatmap'
import { Panel } from '../../components/Panel'
import { Flourish } from '../../components/Flourish'
import type { Weekday } from '../../domain/types'

export function InsightsPage() {
  const { settings } = useSettings()
  const segments = useLiveQuery(() => db.segments.toArray(), [], [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const lists = useLiveQuery(() => db.lists.toArray(), [], [])

  const todayMs = todayFocusedMs(segments)
  const goalMs = settings.dailyGoalMinutes * 60000
  const goalPct = Math.min(100, goalMs > 0 ? (todayMs / goalMs) * 100 : 0)
  const streak = currentStreak(segments, settings)
  const week = weekComparison(segments)
  const days = dailyStats(segments, tasks, 14)
  const maxMs = Math.max(goalMs, ...days.map((d) => d.focusedMs), 1)
  const heatmap = focusHeatmap(segments, settings)

  const byList = focusedMsByList(segments, tasks)
  const listRows = [...byList.entries()]
    .map(([id, ms]) => ({
      id,
      ms,
      name: id === 'inbox' ? 'Inbox' : lists.find((l) => l.id === id)?.name ?? 'Deleted list',
      color: id === 'inbox' ? 'var(--accent-lavender)' : lists.find((l) => l.id === id)?.color ?? 'var(--accent-blue)',
    }))
    .sort((a, b) => b.ms - a.ms)
  const listTotal = listRows.reduce((s, r) => s + r.ms, 0)

  const history = summarizeSessions(sessions, segments).slice(0, 10)
  const workdaySet = new Set<Weekday>(settings.workdays)

  const hasData = segments.some((s) => s.endedAt !== null)

  return (
    <section className="insights">
      <header className="view-header">
        <h1 className="view-title">
          <Icon name="chart" className="view-icon" />Insights
        </h1>
      </header>

      {!hasData ? (
        <div className="empty">
          <Flourish variant="vine" size={64} float />
          <p>Your productivity garden is just getting started. Finish a focus session to see it bloom!</p>
        </div>
      ) : (
        <>
          <section className="card observation-panel">
            <h3 className="group-title">
              <Icon name="sparkle" className="view-icon" /> What we notice
            </h3>
            <ul className="observation-list">
              {buildObservations({ segments, sessions, nowTs: Date.now() }).map((o) => (
                <li key={o.id} className={`observation-item observation-item--${o.kind}`}>
                  {o.text}
                </li>
              ))}
            </ul>
          </section>

          <div className="insight-cards">
            <div className="card stat-card">
              <span className="stat-big">{formatMinutes(todayMs / 60000)}</span>
              <span className="stat-label">focused today</span>
              <div className="timer-bar">
                <div className="timer-bar-fill" style={{ width: `${goalPct}%` }} />
              </div>
              <span className="stat-sub">
                {goalPct >= 100 ? 'Daily goal met!' : `${Math.round(goalPct)}% of ${formatMinutes(settings.dailyGoalMinutes)} goal`}
              </span>
            </div>

            <div className="card stat-card">
              <span className="stat-big">{streak} <Icon name="flame" /></span>
              <span className="stat-label">workday streak</span>
              <span className="stat-sub">rest days never break it</span>
            </div>

            <div className="card stat-card">
              <span className="stat-big">{formatMinutes(week.thisWeekMs / 60000)}</span>
              <span className="stat-label">this week</span>
              <span className="stat-sub">
                {week.deltaMs >= 0 ? '▲' : '▼'} {formatMinutes(Math.abs(week.deltaMs) / 60000)} vs last week
              </span>
            </div>
          </div>

          <Panel title="Your year of focus">
            <FocusHeatmap map={heatmap} />
          </Panel>

          <Panel title="Last 14 days">
            <div className="bar-chart" role="img" aria-label="Daily focused minutes for the last 14 days">
              {days.map((d) => {
                const [, , dd] = d.dateKey.split('-')
                const isWorkday = workdaySet.has(new Date(d.dateKey + 'T00:00').getDay() as Weekday)
                return (
                  <div key={d.dateKey} className="bar-col" title={`${d.dateKey}: ${formatMinutes(d.focusedMs / 60000)}`}>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${d.focusedMs >= goalMs ? 'bar-fill--goal' : ''}`}
                        style={{ height: `${(d.focusedMs / maxMs) * 100}%` }}
                      />
                    </div>
                    <span className={`bar-label ${isWorkday ? '' : 'bar-label--rest'}`}>{Number(dd)}</span>
                  </div>
                )
              })}
            </div>
            <p className="chart-legend">
              <span className="legend-dot legend-dot--goal" /> reached daily goal &nbsp;·&nbsp; faded = rest day
            </p>
          </Panel>

          {listTotal > 0 && (
            <Panel title="Time by list">
              <ul className="list-breakdown">
                {listRows.map((r) => (
                  <li key={r.id} className="breakdown-row">
                    <span className="breakdown-name">
                      <span className="chip-dot" style={{ background: r.color }} />
                      {r.name}
                    </span>
                    <div className="breakdown-bar">
                      <div className="breakdown-bar-fill" style={{ width: `${(r.ms / listTotal) * 100}%`, background: r.color }} />
                    </div>
                    <span className="breakdown-time">{formatMinutes(r.ms / 60000)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Recent sessions">
            <ul className="session-history">
              {history.map(({ session, focusedMs }) => (
                <li key={session.id} className="history-row">
                  <span className="history-date">
                    {new Date(session.startedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    <span className="history-time">
                      {new Date(session.startedAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <span className="history-dur">{formatMinutes(focusedMs / 60000)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </section>
  )
}

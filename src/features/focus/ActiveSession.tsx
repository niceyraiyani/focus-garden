import { useEffect, useRef, useState } from 'react'
import type { FocusSession } from '../../domain/types'
import {
  pauseSession,
  resumeSession,
  switchActiveTask,
  completeQueuedTask,
  addParkingLot,
  addToQueue,
  markNotified,
  stopSession,
} from '../../data/sessions'
import { createTask } from '../../data/tasks'
import { activeMs, isOvertime, remainingMs } from '../../domain/timing'
import { formatClock, formatMinutes } from '../../lib/time'
import { Button, IconButton } from '../../components/Button'
import { Burst } from '../../components/Burst'
import { Icon } from '../../components/Icon'
import { EffortFlowers } from '../../components/EffortFlowers'
import { useToast } from '../../components/ToastContext'
import { useSettings } from '../../app/SettingsContext'
import { useSessionSegments, useNow, useTasksByIds } from './useFocusSession'
import { useSubtasks } from '../tasks/hooks'
import { updateSubtask } from '../../data/tasks'

function notifyMinReached(minutes: number, enabled: boolean) {
  if (enabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('Minimum reached', {
      body: `You focused for ${minutes} minutes. Keep going if you're in flow!`,
    })
  }
}

export function ActiveSession({
  session,
  onEnd,
}: {
  session: FocusSession
  onEnd: (sessionId: string) => void
}) {
  const { settings } = useSettings()
  const { toast } = useToast()
  const running = session.status === 'running'
  const now = useNow(running)
  const segments = useSessionSegments(session.id)
  const queueTasks = useTasksByIds(session.queue)
  const parked = useTasksByIds(session.parkingLot)

  const [burst, setBurst] = useState(0)
  const [startBurst, setStartBurst] = useState(0)
  const [parkText, setParkText] = useState('')
  const notifiedRef = useRef(session.notifiedMinReached)

  // Flower burst when the session has just begun (not when revisiting one).
  useEffect(() => {
    if (Date.now() - session.startedAt < 3000) {
      setStartBurst((b) => b + 1)
    }
    // Only on first mount for this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const elapsed = activeMs(segments, now)
  const over = isOvertime(session, segments, now)
  const remain = remainingMs(session, segments, now)
  const progress = Math.min(100, (elapsed / (session.minMinutes * 60000)) * 100)

  const activeTask = queueTasks.find((t) => t.id === session.activeTaskId) ?? null
  const upcoming = queueTasks.filter((t) => t.id !== session.activeTaskId)

  // Gentle nudge exactly once when the minimum is first reached.
  useEffect(() => {
    if (over && !notifiedRef.current) {
      notifiedRef.current = true
      void markNotified(session.id)
      notifyMinReached(session.minMinutes, settings.notificationsEnabled)
      toast(`${session.minMinutes} min done — keep going or wrap up whenever.`)
    }
  }, [over, session.id, session.minMinutes, settings.notificationsEnabled, toast])

  function cheer() {
    setBurst((b) => b + 1)
  }

  async function completeActive() {
    if (!activeTask) return
    cheer()
    await completeQueuedTask(session.id, activeTask.id)
    toast('One done')
  }

  async function park(e: React.FormEvent) {
    e.preventDefault()
    const title = parkText.trim()
    if (!title) return
    const task = await createTask({ title, listId: null, originSessionId: session.id })
    await addParkingLot(session.id, task.id)
    setParkText('')
    toast('Parked in your Inbox for later')
  }

  async function end() {
    await stopSession(session.id)
    onEnd(session.id)
  }

  return (
    <div className="session">
      <div className="session-timer-wrap">
        <Burst trigger={burst} variant="star" />
        <Burst trigger={startBurst} variant="flower" />
        <div className={`session-timer ${over ? 'session-timer--over' : ''}`}>
          <span className="timer-clock">{formatClock(elapsed)}</span>
          <span className="timer-sub">
            {over ? `+${formatMinutes(elapsed / 60000 - session.minMinutes)} past your ${session.minMinutes}m goal` : `${formatMinutes(remain / 60000)} until your gentle nudge`}
          </span>
          <div className="timer-bar" aria-hidden="true">
            <div
              className={`timer-bar-fill ${over ? 'timer-bar-fill--over' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="session-controls">
        {running ? (
          <Button variant="ghost" onClick={() => pauseSession(session.id)}>
            <Icon name="pause" /> Pause
          </Button>
        ) : (
          <Button variant="primary" onClick={() => resumeSession(session.id)}>
            <Icon name="play" filled /> Resume
          </Button>
        )}
        <Button variant="danger" onClick={end}>
          <Icon name="stop" /> End session
        </Button>
      </div>

      {!running && <p className="paused-note">Paused — the clock is resting. Resume when you’re ready.</p>}

      <div className="session-body">
        <section className="card active-task-card">
          <span className="field-label">Now focusing on</span>
          {activeTask ? (
            <>
              <h2 className="active-task-title">{activeTask.title}</h2>
              <div className="active-task-meta">
                {activeTask.effort > 0 && <EffortFlowers value={activeTask.effort} readOnly />}
              </div>
              {activeTask.notes && <p className="active-task-notes">{activeTask.notes}</p>}
              <ActiveSubtasks taskId={activeTask.id} />
              <Button variant="primary" size="lg" className="complete-btn" onClick={completeActive}>
                <Icon name="check" /> Mark done
              </Button>
            </>
          ) : (
            <div className="empty empty--sm">
              <p>Queue complete — lovely work! Add another or end the session.</p>
            </div>
          )}
        </section>

        <div className="session-side">
          <section className="card">
            <h3 className="group-title">Up next</h3>
            {upcoming.length === 0 ? (
              <p className="muted-note">Nothing queued.</p>
            ) : (
              <ul className="upnext-list">
                {upcoming.map((t) => (
                  <li key={t.id} className="upnext-item">
                    <span className="upnext-title">{t.title}</span>
                    <IconButton label={`Switch to ${t.title}`} onClick={() => switchActiveTask(session.id, t.id)}>
                      ▶
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card parking-lot">
            <h3 className="group-title"><Icon name="bookmark" /> Parking lot</h3>
            <p className="muted-note">A thought popped up? Park it and forget it.</p>
            <form onSubmit={park} className="park-form">
              <input
                className="input"
                value={parkText}
                onChange={(e) => setParkText(e.target.value)}
                placeholder="Type it, let it go…"
                aria-label="Park a distracting thought"
              />
              <button className="btn btn--ghost btn--sm" type="submit" disabled={!parkText.trim()}>
                Park
              </button>
            </form>
            {parked.length > 0 && (
              <ul className="parked-list">
                {parked.map((t) => {
                  const inQueue = session.queue.includes(t.id)
                  const done = t.status === 'completed'
                  return (
                    <li key={t.id} className="parked-item">
                      <span className="parked-title"><Icon name="moon" /> {t.title}</span>
                      {done ? (
                        <span className="parked-tag">done</span>
                      ) : inQueue ? (
                        <span className="parked-tag">in session</span>
                      ) : (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            void addToQueue(session.id, t.id)
                            toast('Added to your session')
                          }}
                        >
                          <Icon name="plus" /> Add to session
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function ActiveSubtasks({ taskId }: { taskId: string }) {
  const subtasks = useSubtasks(taskId)
  if (subtasks.length === 0) return null
  return (
    <ul className="subtask-list active-subtasks">
      {subtasks.map((s) => (
        <li key={s.id} className="subtask">
          <button
            className={`checkbox checkbox--sm ${s.done ? 'checkbox--on' : ''}`}
            role="checkbox"
            aria-checked={s.done}
            aria-label={`Complete step ${s.title}`}
            onClick={() => updateSubtask(s.id, { done: !s.done })}
          >
            {s.done && <Icon name="check" className="checkbox-tick" />}
          </button>
          <span className={s.done ? 'subtask-done' : ''}>{s.title}</span>
        </li>
      ))}
    </ul>
  )
}

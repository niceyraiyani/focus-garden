import { useState } from 'react'
import { useAllOpenTasks, useLists } from '../tasks/hooks'
import { QuickAdd } from '../tasks/QuickAdd'
import { useSettings } from '../../app/SettingsContext'
import { startSession } from '../../data/sessions'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { EffortFlowers } from '../../components/EffortFlowers'
import { Flourish } from '../../components/Flourish'
import type { ID } from '../../domain/types'
import { BlocklistEditor } from './BlocklistEditor'
import { isDesktop } from './nativeBlocker'
import { useToast } from '../../components/ToastContext'

const DURATION_CHOICES = [15, 25, 30, 45, 60]

export function SessionBuilder() {
  const tasks = useAllOpenTasks()
  const lists = useLists()
  const { settings } = useSettings()
  const { toast } = useToast()

  const [queue, setQueue] = useState<ID[]>([])
  const [minutes, setMinutes] = useState(settings.defaultMinMinutes)
  // Guards a double-clicked Start, which would otherwise be rejected by the
  // data layer and surface as an error the user didn't cause.
  const [starting, setStarting] = useState(false)

  const queued = queue
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is (typeof tasks)[number] => !!t)
  // Routine tasks (meds, laundry) are things you just do — putting a 30-minute
  // timer on them isn't focus, it's theatre.
  const available = tasks.filter((t) => !queue.includes(t.id) && !t.routine)

  // "No open tasks" was a lie whenever everything was already queued or was a
  // routine — and it left you staring at a dead end either way.
  const emptyPoolMessage =
    tasks.length === 0
      ? 'Nothing to pick from yet — add your first one above.'
      : queue.length > 0
        ? 'That’s everything — it’s all in your queue.'
        : 'Only routines right now. Those don’t need a timer — just do them.'

  function add(id: ID) {
    setQueue((q) => [...q, id])
  }
  function removeAt(index: number) {
    setQueue((q) => q.filter((_, i) => i !== index))
  }
  function move(index: number, dir: -1 | 1) {
    setQueue((q) => {
      const next = [...q]
      const j = index + dir
      if (j < 0 || j >= next.length) return q
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  function listName(listId: ID | null): string {
    if (!listId) return 'Inbox'
    const l = lists.find((x) => x.id === listId)
    return l ? l.name : 'List'
  }

  return (
    <div className="builder">
      <header className="view-header">
        <h1 className="view-title">
          <Icon name="target" className="view-icon" />Plan a focus session
        </h1>
      </header>
      <p className="builder-lead">
        Pick a few tasks, set a gentle minimum, and start. You can always add more or switch later.
      </p>

      <div className="builder-grid">
        <section className="card builder-pool">
          <h2 className="group-title">Choose tasks</h2>
          {/* Capture right here: the moment you're deciding what to work on is
              exactly when you remember the thing you forgot to write down. */}
          <QuickAdd
            listId={null}
            placeholder="Add something to work on…"
            onAdded={(task) => setQueue((q) => [...q, task.id])}
          />
          {available.length === 0 ? (
            <div className="empty empty--sm">
              <Flourish variant="sprig" size={48} />
              <p>{emptyPoolMessage}</p>
            </div>
          ) : (
            <div className="pool-list">
              {available.map((t) => (
                <button key={t.id} className="pool-item" onClick={() => add(t.id)}>
                  <span className="pool-plus" aria-hidden="true">
                    <Icon name="plus" />
                  </span>
                  <span className="pool-title">{t.title}</span>
                  <span className="pool-meta">
                    {t.effort > 0 && <EffortFlowers value={t.effort} readOnly />}
                    <span className="pool-list-tag">{listName(t.listId)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card builder-queue">
          <h2 className="group-title">Your session queue</h2>
          {queued.length === 0 ? (
            <div className="empty empty--sm">
              <Flourish variant="bloom" size={48} float />
              <p>Add tasks from the left to build your queue.</p>
            </div>
          ) : (
            <ol className="queue-list">
              {queued.map((t, i) => (
                <li key={t.id} className="queue-item">
                  <span className="queue-num">{i + 1}</span>
                  <span className="queue-title">{t.title}</span>
                  <span className="queue-controls">
                    <button className="icon-btn icon-btn--tiny" aria-label="Move up" onClick={() => move(i, -1)}>
                      <Icon name="arrow-up" />
                    </button>
                    <button className="icon-btn icon-btn--tiny" aria-label="Move down" onClick={() => move(i, 1)}>
                      <Icon name="arrow-down" />
                    </button>
                    <button className="icon-btn icon-btn--tiny" aria-label="Remove" onClick={() => removeAt(i)}>
                      <Icon name="close" />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="duration">
            <span className="field-label">Minimum focus</span>
            <div className="seg">
              {DURATION_CHOICES.map((m) => (
                <button
                  key={m}
                  className={`seg-item ${minutes === m ? 'seg-item--on' : ''}`}
                  onClick={() => setMinutes(m)}
                >
                  {m}m
                </button>
              ))}
            </div>
            <p className="duration-hint">
              We’ll gently nudge you at {minutes} min — then keep counting while you’re in flow.
            </p>
          </div>

          {/* Desktop only. On the web there's nothing we can actually block, so
              mentioning it at all just makes a promise the browser can't keep. */}
          {isDesktop() && (
            <details className="builder-block builder-disclosure">
              <summary className="builder-summary">
                <Icon name="ban" /> Blocked while you focus
              </summary>
              <p className="duration-hint">These stay closed until you stop. Tweak the list before you dive in.</p>
              <BlocklistEditor />
            </details>
          )}

          <Button
            variant="primary"
            size="lg"
            className="start-btn"
            disabled={queued.length === 0 || starting}
            onClick={() => {
              setStarting(true)
              startSession(queue, minutes).catch((e) => {
                setStarting(false)
                toast(e instanceof Error ? e.message : 'Could not start the session.')
              })
            }}
          >
            <Icon name="play" filled /> Start focusing
          </Button>
        </section>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useSettings } from '../../app/SettingsContext'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'

/**
 * "What's first next time?" — asked at the end of a session, shown on the
 * launch page at the start of the next one.
 *
 * This is an implementation intention, which is the best-evidenced thing in
 * this whole app (Gollwitzer & Sheeran's meta-analysis puts it at d = 0.65
 * across 94 studies, with *larger* effects for people with self-regulation
 * difficulties). The trick is that the decision gets made now, while the work
 * is still in your head — not tomorrow morning, when deciding is the very
 * thing standing between you and starting.
 */
export function NextUp() {
  const { settings, update } = useSettings()
  const saved = settings.nextUp?.trim() ?? ''
  const [value, setValue] = useState(saved)
  const [done, setDone] = useState(!!saved)

  if (done) {
    return (
      <section className="card next-up next-up--set">
        <span className="field-label">
          <Icon name="target" /> Next time, first thing
        </span>
        <p className="next-up-saved">{saved}</p>
        <Button variant="ghost" onClick={() => setDone(false)}>
          Change it
        </Button>
      </section>
    )
  }

  return (
    <section className="card next-up">
      <span className="field-label">
        <Icon name="target" /> What’s first next time?
      </span>
      <p className="setting-hint">
        Decide it now while it’s fresh. It’ll be waiting on your start page, so tomorrow you just press go.
      </p>
      <form
        className="next-up-form"
        onSubmit={(e) => {
          e.preventDefault()
          void update({ nextUp: value.trim() || null })
          setDone(true)
        }}
      >
        <input
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Pick up the report where I left it…"
          aria-label="First thing next session"
        />
        <Button variant="primary" type="submit" disabled={!value.trim()}>
          Save
        </Button>
      </form>
    </section>
  )
}

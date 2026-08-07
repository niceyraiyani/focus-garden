import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { buildObservations, pickObservation } from './observations'
import { Icon } from '../../components/Icon'

/** How often the line swaps for a different one, in ms. */
const ROTATE_MS = 45000

/**
 * One true thing about your own focus, changing on its own.
 *
 * It rotates rather than sitting still because an unpredictable reward is more
 * activating than a predictable one — and because a number that never moves
 * stops being read after a week. Click it to skip ahead if you want another.
 */
export function ObservationLine() {
  const segments = useLiveQuery(() => db.segments.toArray(), [], [])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [tick, setTick] = useState(() => Math.floor(Math.random() * 1000))

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const list = useMemo(
    () => buildObservations({ segments, sessions, nowTs: Date.now() }),
    [segments, sessions],
  )
  const observation = pickObservation(list, tick)
  if (!observation) return null

  return (
    <button
      className="observation"
      onClick={() => setTick((t) => t + 1)}
      title="Show me another"
      aria-live="polite"
    >
      <Icon name="sparkle" className="observation-mark" />
      <span>{observation.text}</span>
    </button>
  )
}

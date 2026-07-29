import { useEffect, useState } from 'react'
import { useSettings } from '../app/SettingsContext'

export type BurstVariant = 'star' | 'flower' | 'pixel' | 'dot'

const COLORS = [
  'var(--accent-pink)',
  'var(--accent-lavender)',
  'var(--accent-mint)',
  'var(--accent-yellow)',
  'var(--accent-peach)',
  'var(--accent-blue)',
]

function Shape({ variant, color }: { variant: BurstVariant; color: string }) {
  if (variant === 'flower') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18">
        <g fill={color}>
          <circle cx="12" cy="6.5" r="3.4" />
          <circle cx="12" cy="17.5" r="3.4" />
          <circle cx="6.5" cy="12" r="3.4" />
          <circle cx="17.5" cy="12" r="3.4" />
        </g>
        <circle cx="12" cy="12" r="2.4" fill="var(--accent-yellow)" />
      </svg>
    )
  }
  if (variant === 'pixel') {
    return (
      <svg viewBox="0 0 12 12" width="12" height="12">
        <rect x="1" y="1" width="10" height="10" rx="2" fill={color} />
      </svg>
    )
  }
  if (variant === 'dot') {
    return (
      <svg viewBox="0 0 10 10" width="9" height="9">
        <circle cx="5" cy="5" r="4" fill={color} />
      </svg>
    )
  }
  // star
  return (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path
        d="M12 1.6l2.7 7 7.1.4-5.5 4.6 1.8 6.9L12 16.9 5.9 20.5l1.8-6.9L2.2 9l7.1-.4z"
        fill={color}
      />
    </svg>
  )
}

/**
 * A gentle flat celebration burst. `variant` picks the shape: stars for
 * finishing things, flowers for starting them. Respects the user's celebration
 * and motion settings. Increment `trigger` to fire it.
 */
export function Burst({ trigger, variant = 'star' }: { trigger: number; variant?: BurstVariant }) {
  const { settings } = useSettings()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    if (!settings.celebrations || !settings.decorativeMotion) return
    setShow(true)
    const t = window.setTimeout(() => setShow(false), 950)
    return () => window.clearTimeout(t)
  }, [trigger, settings.celebrations, settings.decorativeMotion])

  if (!show) return null

  // The vibe overrides the shape: robot bursts pixels, plain bursts soft dots.
  const effective: BurstVariant =
    settings.vibe === 'robot' ? 'pixel' : settings.vibe === 'plain' ? 'dot' : variant
  const spin = effective === 'star' || effective === 'pixel'
  const count = 14

  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i
        const dist = 58 + (i % 3) * 20
        return (
          <span
            key={i}
            className={`burst-bit ${spin ? 'burst-bit--spin' : ''}`}
            style={{
              ['--tx' as string]: `${Math.cos((angle * Math.PI) / 180) * dist}px`,
              ['--ty' as string]: `${Math.sin((angle * Math.PI) / 180) * dist}px`,
              animationDelay: `${(i % 4) * 25}ms`,
            }}
          >
            <Shape variant={effective} color={COLORS[i % COLORS.length]} />
          </span>
        )
      })}
    </div>
  )
}

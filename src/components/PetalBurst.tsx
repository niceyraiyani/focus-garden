import { useEffect, useState } from 'react'
import { useSettings } from '../app/SettingsContext'

/**
 * A gentle flat petal burst used to reward completion. Petals are solid-color
 * shapes that drift outward and fade — no gradients, no blur. Respects the
 * user's celebration + motion settings.
 */
export function PetalBurst({ trigger }: { trigger: number }) {
  const { settings } = useSettings()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    if (!settings.celebrations || !settings.decorativeMotion) return
    setShow(true)
    const t = window.setTimeout(() => setShow(false), 900)
    return () => window.clearTimeout(t)
  }, [trigger, settings.celebrations, settings.decorativeMotion])

  if (!show) return null

  const colors = [
    'var(--accent-pink)',
    'var(--accent-lavender)',
    'var(--accent-mint)',
    'var(--accent-yellow)',
    'var(--accent-peach)',
    'var(--accent-blue)',
  ]

  return (
    <div className="petal-burst" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (360 / 14) * i
        const dist = 60 + (i % 3) * 18
        return (
          <span
            key={i}
            className="petal"
            style={{
              background: colors[i % colors.length],
              // custom props consumed by the keyframes in ui.css
              ['--tx' as string]: `${Math.cos((angle * Math.PI) / 180) * dist}px`,
              ['--ty' as string]: `${Math.sin((angle * Math.PI) / 180) * dist}px`,
              animationDelay: `${(i % 4) * 20}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

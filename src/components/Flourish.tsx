import { useSettings } from '../app/SettingsContext'

/**
 * Decorative single-weight line art. Purely ornamental: always aria-hidden and
 * never the sole indicator of state. The motif follows the current vibe —
 * flowers, a techy chip (robot), or a minimal ring (plain).
 */

interface FlourishProps {
  variant?: 'sprig' | 'sparkle' | 'vine' | 'bloom'
  color?: string
  size?: number
  className?: string
  float?: boolean
}

export function Flourish({
  variant = 'sprig',
  color = 'var(--accent-lavender)',
  size = 48,
  className = '',
  float = false,
}: FlourishProps) {
  const { settings } = useSettings()
  const cls = ['flourish', float ? 'float' : '', className].filter(Boolean).join(' ')
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: cls,
  }

  // Plain vibe: a quiet minimal mark.
  if (settings.vibe === 'plain') {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="10" />
        <circle cx="24" cy="24" r="2.4" fill={color} />
      </svg>
    )
  }

  // Robot vibe: a small friendly chip/bot motif.
  if (settings.vibe === 'robot') {
    if (variant === 'sparkle') {
      return (
        <svg {...common}>
          <rect x="16" y="16" width="16" height="16" rx="3" />
          <circle cx="24" cy="24" r="3" fill={color} />
          <path d="M20 16v-5M28 16v-5M20 32v5M28 32v5M16 20h-5M16 28h-5M32 20h5M32 28h5" />
        </svg>
      )
    }
    return (
      <svg {...common}>
        <path d="M24 12V7" />
        <circle cx="24" cy="5.5" r="2" fill={color} />
        <rect x="12" y="12" width="24" height="18" rx="6" />
        <circle cx="19" cy="21" r="2" fill={color} />
        <circle cx="29" cy="21" r="2" fill={color} />
        <path d="M19 26q5 3 10 0" />
        <path d="M17 30v6M31 30v6" />
      </svg>
    )
  }

  if (variant === 'sparkle') {
    return (
      <svg {...common}>
        <path d="M24 8c1 8 4 11 12 12-8 1-11 4-12 12-1-8-4-11-12-12 8-1 11-4 12-12Z" />
        <path d="M38 30c.5 3 1.5 4 4 4.5-2.5.5-3.5 1.5-4 4.5-.5-3-1.5-4-4-4.5 2.5-.5 3.5-1.5 4-4.5Z" />
      </svg>
    )
  }

  if (variant === 'vine') {
    return (
      <svg {...common}>
        <path d="M8 40c8-2 12-8 12-16S16 12 24 8" />
        <circle cx="20" cy="24" r="3" fill={color} fillOpacity="0.18" />
        <circle cx="12" cy="34" r="2.4" fill={color} fillOpacity="0.18" />
        <path d="M20 24c3-1 5-3 6-6M12 34c2.5-.5 4-2 5-4" />
      </svg>
    )
  }

  if (variant === 'bloom') {
    return (
      <svg {...common}>
        <circle cx="24" cy="20" r="4" />
        <path d="M24 16c0-4 3-7 7-6-1 4-3 6-7 6ZM24 16c0-4-3-7-7-6 1 4 3 6 7 6ZM24 24c0 4 3 7 7 6-1-4-3-6-7-6ZM24 24c0 4-3 7-7 6 1-4 3-6 7-6Z" />
        <path d="M24 24v16" />
      </svg>
    )
  }

  // sprig
  return (
    <svg {...common}>
      <path d="M24 42V14" />
      <path d="M24 22c-4-2-7-6-6-11 5 0 8 3 8 7M24 28c4-2 7-5 8-10-5-1-8 2-9 6" />
      <circle cx="24" cy="12" r="3" fill={color} fillOpacity="0.18" />
    </svg>
  )
}

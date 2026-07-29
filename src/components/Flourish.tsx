/**
 * Decorative single-weight line art in pastel colors. Purely ornamental:
 * always aria-hidden and never the sole indicator of state. Solid strokes,
 * no gradients, no fills (or flat translucent only).
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

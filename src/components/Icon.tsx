import type { CSSProperties, ReactNode } from 'react'
import type { Vibe } from '../domain/types'

export type IconName =
  | 'sun'
  | 'moon'
  | 'inbox'
  | 'calendar'
  | 'flower'
  | 'trophy'
  | 'target'
  | 'chart'
  | 'gear'
  | 'plant'
  | 'seedling'
  | 'play'
  | 'pause'
  | 'stop'
  | 'check'
  | 'plus'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'monitor'
  | 'flame'
  | 'star'
  | 'leaf'
  | 'download'
  | 'upload'
  | 'ban'
  | 'butterfly'
  | 'mushroom'
  | 'heart'
  | 'cloud'
  | 'tulip'
  | 'sparkle'
  | 'bookmark'
  | 'bolt'
  | 'cpu'
  | 'refresh'

const PATHS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  inbox: (
    <>
      <path d="M4 13l2.5-7A2 2 0 0 1 8.4 4.6h7.2a2 2 0 0 1 1.9 1.4L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="7.4" r="2.7" />
      <circle cx="16.4" cy="10.6" r="2.7" />
      <circle cx="14.7" cy="15.7" r="2.7" />
      <circle cx="9.3" cy="15.7" r="2.7" />
      <circle cx="7.6" cy="10.6" r="2.7" />
      <circle cx="12" cy="12" r="1.9" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4.6a2.4 2.4 0 0 0 2.8 2.6M17 5.5h2.4a2.4 2.4 0 0 1-2.8 2.6" />
      <path d="M12 13v3M9.5 20h5M10.5 20l.4-2.5h2.2l.4 2.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3.2" height="6" rx="1" />
      <rect x="10.4" y="6.5" width="3.2" height="10.5" rx="1" />
      <rect x="15.3" y="13" width="3.2" height="4" rx="1" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.4v3.1M12 18.5v3.1M21.6 12h-3.1M5.5 12H2.4M18.7 5.3l-2.2 2.2M7.5 16.5l-2.2 2.2M18.7 18.7l-2.2-2.2M7.5 7.5L5.3 5.3" />
    </>
  ),
  plant: (
    <>
      <path d="M6.6 13h10.8l-1.2 7.2a1 1 0 0 1-1 .8H8.8a1 1 0 0 1-1-.8z" />
      <path d="M6 13h12" />
      <path d="M12 13c-.6-3 .4-6 3-7.6M12 13c.3-2-.7-4-3-5M12 13c.6-1.9 2.5-2.9 4.7-2.9" />
    </>
  ),
  seedling: (
    <>
      <path d="M12 21v-7" />
      <path d="M12 14c-3.2 0-5.3-2.1-5.3-5.3C9.9 8.7 12 10.8 12 14z" />
      <path d="M12 12.5c2.7 0 4.7-2 4.7-4.7C14 7.8 12 9.8 12 12.5z" />
    </>
  ),
  play: <path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z" />,
  pause: (
    <>
      <rect x="7.3" y="5" width="3.4" height="14" rx="1.2" />
      <rect x="13.3" y="5" width="3.4" height="14" rx="1.2" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-left': <path d="M15 5.5l-7 6.5 7 6.5" />,
  'chevron-right': <path d="M9 5.5l7 6.5-7 6.5" />,
  'arrow-up': <path d="M12 19V5.5M6 11l6-6 6 6" />,
  'arrow-down': <path d="M12 5v13.5M6 13l6 6 6-6" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  flame: <path d="M12 3c1.2 3.2 4.2 4.3 4.2 8.2A4.2 4.2 0 0 1 8 11.2c0-1 .4-1.9 1-2.6C8.8 10.4 12 8.4 12 3z" />,
  star: (
    <path d="M12 3.6l2.5 5.4 5.9.6-4.4 3.9 1.3 5.8L12 16.8l-5.3 2.5 1.3-5.8-4.4-3.9 5.9-.6z" />
  ),
  leaf: (
    <>
      <path d="M5 19c0-7.7 6-13.5 14-13.5C19 13.2 13 19 5 19z" />
      <path d="M5.5 18.5C9 15 12.5 11.5 16 9.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10M8 10.5l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V6M8 9.5l4-4 4 4" />
      <path d="M5 19h14" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11" />
    </>
  ),
  butterfly: (
    <>
      <path d="M12 6.5v11" />
      <path d="M12 8.5C10.8 5.6 7.7 4.7 5.9 6s-.8 5 1.3 6c-2.1 1-3.1 4-1.2 5.2s5.1-.9 6-4" />
      <path d="M12 8.5c1.2-2.9 4.3-3.8 6.1-2.5s.8 5-1.3 6c2.1 1 3.1 4 1.2 5.2s-5.1-.9-6-4" />
    </>
  ),
  mushroom: (
    <>
      <path d="M4.8 11.5a7.2 7.2 0 0 1 14.4 0z" />
      <path d="M9.5 11.5v4.8a2.5 2.5 0 0 0 5 0v-4.8" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.6A3.6 3.6 0 0 1 12 7a3.6 3.6 0 0 1 7 3.4C19 15.6 12 20 12 20z" />,
  cloud: <path d="M7 18h10a3.6 3.6 0 0 0 .3-7.2A5.1 5.1 0 0 0 7.4 9.8 3.6 3.6 0 0 0 7 18z" />,
  tulip: (
    <>
      <path d="M12 21v-8.5" />
      <path d="M7.8 12.6c-1-4.2 1-8.2 4.2-9.4 3.2 1.2 5.2 5.2 4.2 9.4-1.6-1.1-2.7-1.7-4.2-1.7s-2.6.6-4.2 1.7z" />
    </>
  ),
  sparkle: <path d="M12 3c.7 4.2 2.1 5.6 6.3 6.3-4.2.7-5.6 2.1-6.3 6.3-.7-4.2-2.1-5.6-6.3-6.3C9.9 8.6 11.3 7.2 12 3z" />,
  bookmark: <path d="M7 4h10v16l-5-3.6L7 20z" />,
  bolt: <path d="M13 2 4.5 13.2a.6.6 0 0 0 .48.95H11l-1 8 8.5-11.2a.6.6 0 0 0-.48-.95H12z" />,
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 2.5V5M14 2.5V5M10 19v2.5M14 19v2.5M2.5 10H5M2.5 14H5M19 10h2.5M19 14h2.5" />
      <rect x="10.5" y="10.5" width="3" height="3" rx="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number | string
  className?: string
  filled?: boolean
  style?: CSSProperties
}

export function Icon({ name, size, className = '', filled = false, style }: IconProps) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size ?? '1em'}
      height={size ?? '1em'}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {PATHS[name]}
    </svg>
  )
}

const NAMES = new Set(Object.keys(PATHS))

export function isIconName(value: string): value is IconName {
  return NAMES.has(value)
}

/** Renders a line icon by name, falling back to raw text (e.g. legacy emoji). */
export function ListGlyph({ icon, className }: { icon: string; className?: string }) {
  if (isIconName(icon)) return <Icon name={icon} className={className} />
  return <span className={className}>{icon}</span>
}

// --- Vibe-aware icon choices (keep motifs on-theme per vibe) ---

/** The unit icon for the 1–5 effort rating. */
export function effortIconFor(vibe: Vibe | undefined): IconName {
  return vibe === 'robot' ? 'bolt' : vibe === 'plain' ? 'star' : 'flower'
}

/** The little decorative icon beside the Today greeting. */
export function greetingIconFor(vibe: Vibe | undefined): IconName {
  return vibe === 'robot' ? 'sparkle' : vibe === 'plain' ? 'sun' : 'flower'
}

/** The leading icon in the quick-capture box. */
export function captureIconFor(vibe: Vibe | undefined): IconName {
  return vibe === 'robot' ? 'sparkle' : vibe === 'plain' ? 'plus' : 'seedling'
}

/** The icon for the "Needs a home" triage card. */
export function needsHomeIconFor(vibe: Vibe | undefined): IconName {
  return vibe === 'flowers' ? 'plant' : 'inbox'
}

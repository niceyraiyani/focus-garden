import { useSettings } from '../app/SettingsContext'

interface CompanionProps {
  /** Visual mood of the companion. */
  mood?: 'idle' | 'working' | 'celebrate'
  size?: number
}

/**
 * A tiny local-only companion for body-doubling on the focus screen.
 * Line-art + pixel style. No audio, network, or AI — just a friendly face.
 * Hidden entirely when the user turns it off in settings.
 */
export function Companion({ mood = 'idle', size = 88 }: CompanionProps) {
  const { settings } = useSettings()
  if (!settings.showCompanion) return null

  const bob = settings.decorativeMotion && mood !== 'celebrate' ? 'float' : ''
  const cheer = mood === 'celebrate' ? 'bounce' : ''

  return (
    <div
      className={`companion ${bob} ${cheer}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        {/* body */}
        <rect
          x="16"
          y="18"
          width="32"
          height="30"
          rx="12"
          fill="var(--soft-mint)"
          stroke="var(--accent-mint)"
          strokeWidth="1.6"
        />
        {/* antenna */}
        <path d="M32 18v-6" stroke="var(--accent-lavender)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="32" cy="10" r="2.4" fill="var(--accent-lavender)" />
        {/* eyes */}
        {mood === 'celebrate' ? (
          <>
            <path d="M24 30c1.5-2 4-2 5 0" stroke="var(--fg)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M35 30c1.5-2 4-2 5 0" stroke="var(--fg)" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="26" cy="31" r="2.4" fill="var(--fg)" />
            <circle cx="38" cy="31" r="2.4" fill="var(--fg)" />
          </>
        )}
        {/* cheeks */}
        <circle cx="22" cy="36" r="2" fill="var(--accent-pink)" fillOpacity="0.6" />
        <circle cx="42" cy="36" r="2" fill="var(--accent-pink)" fillOpacity="0.6" />
        {/* mouth */}
        <path
          d={mood === 'working' ? 'M29 39h6' : 'M29 39c1.5 2 4.5 2 6 0'}
          stroke="var(--fg)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* little feet */}
        <path d="M26 48v4M38 48v4" stroke="var(--accent-mint)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

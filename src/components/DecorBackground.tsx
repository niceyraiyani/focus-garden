import { useSettings } from '../app/SettingsContext'
import { MeadowBackground } from './MeadowBackground'
import { CircuitBackground } from './CircuitBackground'

/** Renders the decorative backdrop for the current vibe (none for plain). */
export function DecorBackground() {
  const { settings } = useSettings()
  if (settings.vibe === 'plain') return null
  if (settings.vibe === 'robot') return <CircuitBackground />
  return <MeadowBackground />
}

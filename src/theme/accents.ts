import type { AccentName, Vibe } from '../domain/types'

/** All selectable accents, in picker order. Kept small on purpose (calm, not
 *  overwhelming), with one comfortable option per canvas temperature. */
export const ACCENT_NAMES: AccentName[] = ['white', 'blush', 'amber', 'mint', 'sky', 'lavender']

/**
 * The accent that best matches each vibe's canvas. Applied automatically when a
 * vibe is chosen so the pairing looks right out of the box — the user can still
 * pick any accent afterwards.
 */
export const VIBE_DEFAULT_ACCENT: Record<Vibe, AccentName> = {
  plain: 'white',
  flowers: 'white',
  robot: 'sky',
}

/**
 * Coerce a possibly-unknown stored accent to a valid one. Settings saved with an
 * older palette (terracotta, sage, …) gracefully fall back to the current vibe's
 * match instead of rendering with no accent.
 */
export function resolveAccent(
  accent: AccentName | null | undefined,
  vibe: Vibe | null | undefined,
): AccentName {
  if (accent && ACCENT_NAMES.includes(accent)) return accent
  return VIBE_DEFAULT_ACCENT[vibe ?? 'flowers']
}

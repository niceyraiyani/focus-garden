/** Stable id generation. Uses crypto.randomUUID where available. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for very old environments / tests.
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

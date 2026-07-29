import { useState } from 'react'
import { useActiveSession } from './useFocusSession'
import { SessionBuilder } from './SessionBuilder'
import { ActiveSession } from './ActiveSession'
import { SessionReview } from './SessionReview'

export function FocusPage() {
  const session = useActiveSession()
  const [reviewId, setReviewId] = useState<string | null>(null)

  if (reviewId) return <SessionReview sessionId={reviewId} onClose={() => setReviewId(null)} />
  if (session) return <ActiveSession session={session} onEnd={setReviewId} />
  return <SessionBuilder />
}

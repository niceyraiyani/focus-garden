import { beforeEach, describe, it, expect } from 'vitest'
import { db } from './db'
import { createTask } from './tasks'
import {
  startSession,
  pauseSession,
  resumeSession,
  switchActiveTask,
  completeQueuedTask,
  addParkingLot,
  stopSession,
  getActiveSession,
  getSessionSegments,
} from './sessions'

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.sessions.clear(), db.segments.clear()])
})

async function openSegments(sessionId: string) {
  return (await getSessionSegments(sessionId)).filter((s) => s.endedAt === null)
}

describe('focus session engine', () => {
  it('runs a full lifecycle with correct segment + queue transitions', async () => {
    const a = await createTask({ title: 'a' })
    const b = await createTask({ title: 'b' })

    // start
    const session = await startSession([a.id, b.id], 30)
    expect(session.status).toBe('running')
    expect(session.activeTaskId).toBe(a.id)
    let open = await openSegments(session.id)
    expect(open).toHaveLength(1)
    expect(open[0].taskId).toBe(a.id)

    // pause closes the open segment
    await pauseSession(session.id)
    expect((await db.sessions.get(session.id))!.status).toBe('paused')
    expect(await openSegments(session.id)).toHaveLength(0)

    // resume opens a fresh segment for the same task
    await resumeSession(session.id)
    open = await openSegments(session.id)
    expect(open).toHaveLength(1)
    expect(open[0].taskId).toBe(a.id)

    // switch to b closes a's segment and opens b's
    await switchActiveTask(session.id, b.id)
    open = await openSegments(session.id)
    expect(open).toHaveLength(1)
    expect(open[0].taskId).toBe(b.id)
    expect((await db.sessions.get(session.id))!.activeTaskId).toBe(b.id)

    // completing the active task marks it done and advances to the next
    await completeQueuedTask(session.id, b.id)
    expect((await db.tasks.get(b.id))!.status).toBe('completed')
    const afterComplete = (await db.sessions.get(session.id))!
    expect(afterComplete.queue).toEqual([a.id])
    expect(afterComplete.activeTaskId).toBe(a.id)
    open = await openSegments(session.id)
    expect(open[0].taskId).toBe(a.id)

    // park a distracting thought
    const parked = await createTask({ title: 'random idea', originSessionId: session.id })
    await addParkingLot(session.id, parked.id)
    expect((await db.sessions.get(session.id))!.parkingLot).toContain(parked.id)

    // stop closes everything
    await stopSession(session.id)
    const ended = (await db.sessions.get(session.id))!
    expect(ended.status).toBe('completed')
    expect(ended.endedAt).not.toBeNull()
    expect(await openSegments(session.id)).toHaveLength(0)
  })

  it('getActiveSession finds a running session and ignores completed ones', async () => {
    const a = await createTask({ title: 'a' })
    const session = await startSession([a.id], 25)
    expect((await getActiveSession())?.id).toBe(session.id)
    await stopSession(session.id)
    expect(await getActiveSession()).toBeUndefined()
  })
})

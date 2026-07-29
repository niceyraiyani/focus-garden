import { db } from './db'
import { newId } from '../domain/ids'
import { setTaskComplete } from './tasks'
import type { FocusSession, FocusSegment, ID } from '../domain/types'

const now = () => Date.now()

/** Close any open segment for a session (sets endedAt = now). */
async function closeOpenSegment(sessionId: ID): Promise<void> {
  const open = await db.segments
    .where('sessionId')
    .equals(sessionId)
    .filter((s) => s.endedAt === null)
    .toArray()
  for (const s of open) {
    await db.segments.update(s.id, { endedAt: now() })
  }
}

async function openSegment(sessionId: ID, taskId: ID | null): Promise<void> {
  const seg: FocusSegment = {
    id: newId(),
    sessionId,
    taskId,
    startedAt: now(),
    endedAt: null,
  }
  await db.segments.add(seg)
}

/** The single active session, if any (running or paused). */
export async function getActiveSession(): Promise<FocusSession | undefined> {
  const running = await db.sessions.where('status').equals('running').toArray()
  if (running.length) return running[0]
  const paused = await db.sessions.where('status').equals('paused').toArray()
  return paused[0]
}

export async function startSession(queue: ID[], minMinutes: number): Promise<FocusSession> {
  const ts = now()
  const activeTaskId = queue[0] ?? null
  const session: FocusSession = {
    id: newId(),
    status: 'running',
    queue: [...queue],
    activeTaskId,
    parkingLot: [],
    minMinutes,
    startedAt: ts,
    endedAt: null,
    notifiedMinReached: false,
    createdAt: ts,
    updatedAt: ts,
  }
  await db.transaction('rw', db.sessions, db.segments, async () => {
    await db.sessions.add(session)
    await openSegment(session.id, activeTaskId)
  })
  return session
}

export async function pauseSession(id: ID): Promise<void> {
  await db.transaction('rw', db.sessions, db.segments, async () => {
    await closeOpenSegment(id)
    await db.sessions.update(id, { status: 'paused', updatedAt: now() })
  })
}

export async function resumeSession(id: ID): Promise<void> {
  await db.transaction('rw', db.sessions, db.segments, async () => {
    const s = await db.sessions.get(id)
    if (!s) return
    await openSegment(id, s.activeTaskId)
    await db.sessions.update(id, { status: 'running', updatedAt: now() })
  })
}

export async function switchActiveTask(id: ID, taskId: ID | null): Promise<void> {
  await db.transaction('rw', db.sessions, db.segments, async () => {
    const s = await db.sessions.get(id)
    if (!s) return
    await closeOpenSegment(id)
    if (s.status === 'running') {
      await openSegment(id, taskId)
    }
    await db.sessions.update(id, { activeTaskId: taskId, updatedAt: now() })
  })
}

export async function addToQueue(id: ID, taskId: ID): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s || s.queue.includes(taskId)) return
  await db.sessions.update(id, { queue: [...s.queue, taskId], updatedAt: now() })
}

export async function removeFromQueue(id: ID, taskId: ID): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s) return
  const queue = s.queue.filter((t) => t !== taskId)
  const activeTaskId = s.activeTaskId === taskId ? (queue[0] ?? null) : s.activeTaskId
  await db.sessions.update(id, { queue, activeTaskId, updatedAt: now() })
}

/** Mark the given task complete and advance the queue to the next open task. */
export async function completeQueuedTask(id: ID, taskId: ID): Promise<void> {
  await setTaskComplete(taskId, true)
  await db.transaction('rw', db.sessions, db.segments, async () => {
    const s = await db.sessions.get(id)
    if (!s) return
    const queue = s.queue.filter((t) => t !== taskId)
    if (s.activeTaskId === taskId) {
      const nextTask = queue[0] ?? null
      await closeOpenSegment(id)
      if (s.status === 'running') await openSegment(id, nextTask)
      await db.sessions.update(id, { queue, activeTaskId: nextTask, updatedAt: now() })
    } else {
      await db.sessions.update(id, { queue, updatedAt: now() })
    }
  })
}

export async function addParkingLot(id: ID, taskId: ID): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s) return
  await db.sessions.update(id, {
    parkingLot: [...s.parkingLot, taskId],
    updatedAt: now(),
  })
}

export async function markNotified(id: ID): Promise<void> {
  await db.sessions.update(id, { notifiedMinReached: true, updatedAt: now() })
}

export async function stopSession(id: ID): Promise<void> {
  await db.transaction('rw', db.sessions, db.segments, async () => {
    await closeOpenSegment(id)
    await db.sessions.update(id, { status: 'completed', endedAt: now(), updatedAt: now() })
  })
}

export async function getSessionSegments(id: ID): Promise<FocusSegment[]> {
  return db.segments.where('sessionId').equals(id).toArray()
}

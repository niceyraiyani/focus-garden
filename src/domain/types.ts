// Core domain types for lock.in.
// Uses string-literal unions + const maps instead of TS enums
// (tsconfig has erasableSyntaxOnly).

export type ID = string

export type TaskStatus = 'open' | 'completed'

export type Priority = 'none' | 'low' | 'medium' | 'high'

/** Effort level 1..5, presented as 1-5 flowers ("Tiny".."Big Push"). */
export type EffortLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface Task {
  id: ID
  title: string
  notes: string
  status: TaskStatus
  /** Owning list; null/undefined means the task lives in the Inbox. */
  listId: ID | null
  tagIds: ID[]
  /** ISO date string (yyyy-mm-dd) or null. Date only, no time. */
  dueDate: string | null
  priority: Priority
  /** 0 = unset, otherwise 1..5. */
  effort: EffortLevel
  /** Manual ordering rank within Inbox or its list. Lower = higher. */
  sortRank: number
  createdAt: number
  updatedAt: number
  completedAt: number | null
  /** If captured via a session Parking Lot, the originating session id. */
  originSessionId: ID | null
  /**
   * How often this task comes back. Completing a repeating task schedules the
   * next one; missed occurrences are skipped rather than stacking up.
   */
  repeat?: Repeat
  /**
   * Date (yyyy-mm-dd) before which this task stays out of every list.
   *
   * Repeating tasks sleep until they're due again, so finishing one actually
   * clears it off your plate instead of instantly reappearing with a new date.
   */
  hiddenUntil?: string | null
  /**
   * A thing you just do — meds, laundry, bins. Kept out of focus sessions,
   * because putting a 30-minute timer on taking a tablet is absurd.
   */
  routine?: boolean
}

/** Recurrence cadence. `none` (or absent) means a one-off task. */
export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'

export interface Subtask {
  id: ID
  taskId: ID
  title: string
  done: boolean
  sortRank: number
  createdAt: number
  updatedAt: number
}

export interface List {
  id: ID
  name: string
  color: string
  icon: string
  sortRank: number
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: ID
  name: string
  color: string
  createdAt: number
  updatedAt: number
}

export type SessionStatus = 'running' | 'paused' | 'completed'

export interface FocusSession {
  id: ID
  status: SessionStatus
  /** Ordered task ids selected for this session. */
  queue: ID[]
  /** Task currently being worked on (null when paused with none active). */
  activeTaskId: ID | null
  /** Task ids captured to the Parking Lot during this session. */
  parkingLot: ID[]
  /**
   * Tasks finished during this session, in completion order. Kept separately
   * because finishing a task removes it from `queue`, and the review still
   * needs to report what you got done.
   */
  completedTaskIds?: ID[]
  minMinutes: number
  startedAt: number
  endedAt: number | null
  /**
   * Heartbeat written while the app is open and the session is running. Used
   * to end a session at the moment you actually left, instead of letting an
   * open segment accrue time while the app is closed.
   */
  lastActiveAt?: number
  /** Whether the "minimum reached" notification already fired. */
  notifiedMinReached: boolean
  createdAt: number
  updatedAt: number
}

/**
 * A contiguous period of active focus within a session. Active focused time
 * is the sum of segment durations; paused time is simply uncovered by any
 * segment. taskId may be null if no task was active during the segment.
 */
export interface FocusSegment {
  id: ID
  sessionId: ID
  taskId: ID | null
  startedAt: number
  endedAt: number | null
}

export type ThemeMode = 'system' | 'light' | 'dark'

export type AccentName = 'white' | 'blush' | 'amber' | 'mint' | 'sky' | 'lavender'

/** Decorative style: minimal, floral, or techy. Also sets the base canvas. */
export type Vibe = 'plain' | 'flowers' | 'robot'

/** 0=Sunday .. 6=Saturday, matching Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Settings {
  id: 'app'
  theme: ThemeMode
  /** Accent color family. */
  accent: AccentName
  /** Decorative style + base canvas. */
  vibe: Vibe
  /** Retro window chrome: title bars, chunky borders, hard shadows. */
  retro: boolean
  defaultMinMinutes: number
  notificationsEnabled: boolean
  /** A once-a-day prompt to start, since the app can't reach you otherwise. */
  dailyNudge: boolean
  /** Local "HH:MM" the daily nudge fires at. */
  dailyNudgeAt: string
  /**
   * Local date the daily nudge last fired. Stored here rather than in
   * localStorage so the service worker can see it too and not repeat it.
   */
  nudgeLastFiredOn?: string | null
  /** Days that count toward goals and streaks. */
  workdays: Weekday[]
  /** Daily focus goal in minutes. */
  dailyGoalMinutes: number
  /** Low-stimulation toggles. */
  decorativeMotion: boolean
  celebrations: boolean
  /** Domains to block during a focus session (used by the desktop blocker). */
  blocklist: string[]
  /**
   * Links shown on the launch page. Kept deliberately small — this is a
   * jumping-off point, not a bookmark manager.
   */
  quickLinks?: QuickLink[]
  /**
   * What you said you'd start on next, captured when a session ends. Shown on
   * the launch page so the decision is already made when you sit down.
   */
  nextUp?: string | null
  version: number
}

export interface QuickLink {
  label: string
  url: string
}

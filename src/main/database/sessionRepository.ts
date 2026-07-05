import { randomUUID } from 'crypto'
import { getDatabase } from './db'

export interface SessionRow {
  session_id: string
  session_mode: 'pomodoro' | 'standard'
  session_type: 'focus' | 'shortBreak' | 'longBreak' | null
  start_time: number
  end_time: number | null
  duration_planned_sec: number | null
  duration_actual_sec: number | null
  completed: number // 0 or 1 (SQLite doesn't have booleans)
  end_reason: string | null
  focus_score: number | null
  created_at: number
}

/**
 * Creates a new session row. Validates the mode/duration contract:
 *  - Pomodoro MUST have a non-null durationPlannedSec and sessionType
 *  - Standard MUST have null durationPlannedSec and null sessionType
 *
 * This contract is enforced here rather than at the DB level so the error
 * message is clear and debuggable, rather than a cryptic constraint violation.
 */
export function createSession(
  mode: 'pomodoro' | 'standard',
  sessionType: 'focus' | 'shortBreak' | 'longBreak' | null,
  durationPlannedSec: number | null
): SessionRow {
  // Validate mode/duration contract
  if (mode === 'pomodoro') {
    if (durationPlannedSec === null || durationPlannedSec <= 0) {
      throw new Error(
        `[SessionRepository] Pomodoro session requires a positive durationPlannedSec, ` +
        `but received: ${durationPlannedSec}. A pomodoro session without a planned ` +
        `duration would break countdown logic and analytics.`
      )
    }
    if (sessionType === null) {
      throw new Error(
        `[SessionRepository] Pomodoro session requires a sessionType ` +
        `('focus' | 'shortBreak' | 'longBreak'), but received null.`
      )
    }
  } else if (mode === 'standard') {
    if (durationPlannedSec !== null) {
      throw new Error(
        `[SessionRepository] Standard session must NOT have a durationPlannedSec ` +
        `(received: ${durationPlannedSec}). Standard sessions are open-ended — ` +
        `a planned duration would silently break analytics assumptions since there ` +
        `is no countdown target to measure completion against.`
      )
    }
    if (sessionType !== null) {
      throw new Error(
        `[SessionRepository] Standard session must NOT have a sessionType ` +
        `(received: ${sessionType}). Session types are a pomodoro-only concept.`
      )
    }
  }

  const db = getDatabase()
  const sessionId = randomUUID()
  const startTime = Date.now()

  const stmt = db.prepare(`
    INSERT INTO sessions (session_id, session_mode, session_type, start_time, duration_planned_sec)
    VALUES (?, ?, ?, ?, ?)
  `)

  stmt.run(sessionId, mode, sessionType, startTime, durationPlannedSec)

  return {
    session_id: sessionId,
    session_mode: mode,
    session_type: sessionType,
    start_time: startTime,
    end_time: null,
    duration_planned_sec: durationPlannedSec,
    duration_actual_sec: null,
    completed: 0,
    end_reason: null,
    focus_score: null,
    created_at: startTime
  }
}

/**
 * Completes (or abandons) a session. Records the actual duration,
 * whether the session counted as completed, and HOW it ended.
 */
export function completeSession(
  sessionId: string,
  durationActualSec: number,
  completed: boolean,
  endReason: 'auto_complete' | 'manual_stop' | 'abandoned' | 'force_ended'
): SessionRow | null {
  const db = getDatabase()
  const endTime = Date.now()

  const stmt = db.prepare(`
    UPDATE sessions
    SET end_time = ?, duration_actual_sec = ?, completed = ?, end_reason = ?
    WHERE session_id = ?
  `)

  stmt.run(endTime, durationActualSec, completed ? 1 : 0, endReason, sessionId)

  return getSessionById(sessionId)
}

/**
 * Retrieves all sessions, ordered by most recent first.
 */
export function getAllSessions(): SessionRow[] {
  const db = getDatabase()
  const stmt = db.prepare(`SELECT * FROM sessions ORDER BY start_time DESC`)
  return stmt.all() as SessionRow[]
}

/**
 * Retrieves a single session by ID.
 */
export function getSessionById(sessionId: string): SessionRow | null {
  const db = getDatabase()
  const stmt = db.prepare(`SELECT * FROM sessions WHERE session_id = ?`)
  return (stmt.get(sessionId) as SessionRow) || null
}

/**
 * Retrieves sessions within a date range (start_time between startMs and endMs).
 */
export function getSessionsInDateRange(startMs: number, endMs: number): SessionRow[] {
  const db = getDatabase()
  const stmt = db.prepare(
    `SELECT * FROM sessions WHERE start_time >= ? AND start_time <= ? ORDER BY start_time DESC`
  )
  return stmt.all(startMs, endMs) as SessionRow[]
}

import { getDatabase } from '../database/db'
import { getSessionById } from '../database/sessionRepository'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates the telemetry integrity of a completed session.
 */
export function validateSession(sessionId: string): ValidationResult {
  const db = getDatabase()
  const errors: string[] = []
  const warnings: string[] = []

  const session = getSessionById(sessionId)
  if (!session) {
    return {
      isValid: false,
      errors: [`Session ID ${sessionId} not found in database.`],
      warnings: []
    }
  }

  const durationSec = session.duration_actual_sec || 0

  // 1. Check window_focus records count for sessions > 30s
  const focusCount = (db.prepare(`
    SELECT COUNT(*) as count FROM window_focus WHERE session_id = ?
  `).get(sessionId) as { count: number }).count

  if (durationSec > 30 && focusCount === 0) {
    errors.push(`Validation Error: Session duration is ${durationSec}s (>30s) but no window focus ticks were captured.`)
  }

  // 2. Check for KPM gaps > 2 minutes (120 seconds)
  const kpmRecords = db.prepare(`
    SELECT timestamp FROM keyboard_metrics WHERE session_id = ? ORDER BY timestamp ASC
  `).all(sessionId) as { timestamp: number }[]

  for (let i = 1; i < kpmRecords.length; i++) {
    const gapMs = kpmRecords[i].timestamp - kpmRecords[i - 1].timestamp
    const gapSec = gapMs / 1000
    if (gapSec > 120) {
      warnings.push(`Validation Warning: KPM gap of ${Math.round(gapSec)}s detected between keystroke intervals.`)
    }
  }

  // 3. Check if idle_duration exceeds session duration
  const maxIdleRes = db.prepare(`
    SELECT MAX(idle_duration) as max_idle FROM mouse_metrics WHERE session_id = ?
  `).get(sessionId) as { max_idle: number | null }
  const maxIdle = maxIdleRes && maxIdleRes.max_idle !== null ? maxIdleRes.max_idle : 0

  if (maxIdle > durationSec) {
    errors.push(`Validation Error: Maximum idle duration (${maxIdle}s) exceeds the actual session duration (${durationSec}s).`)
  }

  // 4. Check for duplicate timestamps in window_focus, keyboard_metrics, and mouse_metrics
  const dupFocus = db.prepare(`
    SELECT timestamp, COUNT(*) as count FROM window_focus WHERE session_id = ? GROUP BY timestamp HAVING count > 1
  `).all(sessionId) as { timestamp: number; count: number }[]

  const dupKpm = db.prepare(`
    SELECT timestamp, COUNT(*) as count FROM keyboard_metrics WHERE session_id = ? GROUP BY timestamp HAVING count > 1
  `).all(sessionId) as { timestamp: number; count: number }[]

  const dupMouse = db.prepare(`
    SELECT timestamp, COUNT(*) as count FROM mouse_metrics WHERE session_id = ? GROUP BY timestamp HAVING count > 1
  `).all(sessionId) as { timestamp: number; count: number }[]

  if (dupFocus.length > 0) {
    errors.push(`Validation Error: Found ${dupFocus.length} duplicate timestamp entries in window_focus table.`)
  }
  if (dupKpm.length > 0) {
    errors.push(`Validation Error: Found ${dupKpm.length} duplicate timestamp entries in keyboard_metrics table.`)
  }
  if (dupMouse.length > 0) {
    errors.push(`Validation Error: Found ${dupMouse.length} duplicate timestamp entries in mouse_metrics table.`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

import { getDatabase } from './db'

export interface WindowFocusRow {
  session_id: string
  app_name: string
  window_title: string
  timestamp: number
}

export interface AppUsageStats {
  app_name: string
  focus_count: number
}

/**
 * Inserts a new window focus entry into the database.
 */
export function insertWindowFocus(sessionId: string, appName: string, windowTitle: string): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO window_focus (session_id, app_name, window_title, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, appName, windowTitle, Date.now())
}

/**
 * Retrieves the full window focus history for a given session.
 */
export function getWindowFocusHistory(sessionId: string): WindowFocusRow[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT session_id, app_name, window_title, timestamp
    FROM window_focus
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(sessionId) as WindowFocusRow[]
}

/**
 * Retrieves grouped stats for the most used applications in a session.
 */
export function getMostUsedApps(sessionId: string): AppUsageStats[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT app_name, COUNT(*) as focus_count
    FROM window_focus
    WHERE session_id = ?
    GROUP BY app_name
    ORDER BY focus_count DESC
  `).all(sessionId) as AppUsageStats[]
}

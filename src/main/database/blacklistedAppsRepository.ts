import { getDatabase } from './db'
import { randomUUID } from 'crypto'

export interface BlacklistedAppRow {
  app_name: string
  enabled: number // 0 or 1
  created_at: number
}

export interface AppKillEventRow {
  event_id: string
  session_id: string
  app_name: string
  killed_at: number
}

/**
 * Returns all configured blacklisted apps.
 */
export function getAllBlacklistedApps(): BlacklistedAppRow[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM blacklisted_apps ORDER BY created_at DESC').all() as BlacklistedAppRow[]
}

/**
 * Returns names of all enabled blacklisted apps.
 */
export function getEnabledBlacklistedApps(): string[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT app_name FROM blacklisted_apps WHERE enabled = 1').all() as { app_name: string }[]
  return rows.map((r) => r.app_name)
}

/**
 * Adds an application to the blacklist.
 */
export function addBlacklistedApp(appName: string): void {
  const cleanName = appName.trim()
  if (!cleanName) {
    throw new Error('Application name cannot be empty')
  }

  const db = getDatabase()
  db.prepare('INSERT OR IGNORE INTO blacklisted_apps (app_name, enabled) VALUES (?, 1)').run(cleanName)
}

/**
 * Removes an application from the blacklist.
 */
export function removeBlacklistedApp(appName: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM blacklisted_apps WHERE app_name = ?').run(appName.trim())
}

/**
 * Toggles an application's enabled status.
 */
export function toggleBlacklistedApp(appName: string, enabled: boolean): void {
  const db = getDatabase()
  db.prepare('UPDATE blacklisted_apps SET enabled = ? WHERE app_name = ?').run(
    enabled ? 1 : 0,
    appName.trim()
  )
}

/**
 * Logs a process termination event to app_kill_events.
 */
export function logAppKillEvent(sessionId: string, appName: string): void {
  const db = getDatabase()
  const eventId = randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO app_kill_events (event_id, session_id, app_name, killed_at)
    VALUES (?, ?, ?, ?)
  `).run(eventId, sessionId, appName, now)
}

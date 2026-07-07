import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { DEFAULT_BLOCKED_DOMAINS } from '../blocking/blockedDomainsList'
import { DEFAULT_BLACKLISTED_APPS } from '../blocking/blacklistedAppsList'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'focus-engine.db')
  console.log(`[DB] Opening database at: ${dbPath}`)

  db = new Database(dbPath)

  // Enable WAL mode for better concurrent read/write performance
  db.pragma('journal_mode = WAL')

  // Create sessions table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      session_mode TEXT NOT NULL,
      session_type TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_planned_sec INTEGER,
      duration_actual_sec INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      end_reason TEXT,
      focus_score REAL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
    );
  `)

  // Create blocked_domains table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_domains (
      domain TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
    );
  `)

  // Check if we need to migrate/recreate blacklisted_apps table due to schema shift
  try {
    const columns = db.pragma("table_info(blacklisted_apps)") as { name: string }[]
    if (columns.length > 0) {
      const hasIsEnabled = columns.some((c) => c.name === 'is_enabled')
      if (!hasIsEnabled) {
        console.log('[DB] Outdated blacklisted_apps schema detected. Dropping old tables to recreate...')
        db.exec('DROP TABLE IF EXISTS app_kill_events;')
        db.exec('DROP TABLE IF EXISTS blacklisted_apps;')
      }
    }
  } catch (err) {
    console.error('[DB] Failed schema verification check:', err)
  }

  // Create blacklisted_apps table with is_enabled column
  db.exec(`
    CREATE TABLE IF NOT EXISTS blacklisted_apps (
      app_name TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1
    );
  `)

  // Create app_kill_events table with AUTOINCREMENT and DATETIME defaults
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_kill_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      app_name TEXT NOT NULL,
      killed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Create window_focus table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS window_focus (
      session_id TEXT NOT NULL,
      app_name TEXT NOT NULL,
      window_title TEXT NOT NULL,
      domain TEXT,
      category TEXT,
      timestamp INTEGER NOT NULL
    );
  `)

  // Migrate existing window_focus tables that lack the domain and category columns
  try {
    const columns = db.pragma("table_info(window_focus)") as { name: string }[]
    if (columns.length > 0) {
      const hasDomain = columns.some((c) => c.name === 'domain')
      const hasCategory = columns.some((c) => c.name === 'category')
      if (!hasDomain) {
        console.log('[DB] Migrating window_focus table: Adding domain column...')
        db.exec('ALTER TABLE window_focus ADD COLUMN domain TEXT;')
      }
      if (!hasCategory) {
        console.log('[DB] Migrating window_focus table: Adding category column...')
        db.exec('ALTER TABLE window_focus ADD COLUMN category TEXT;')
      }
    }
  } catch (err) {
    console.error('[DB] Failed window_focus table migration check:', err)
  }

  // Create index on session_id for quick history lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_window_focus_session_id ON window_focus(session_id);
  `)

  // Seed blocked_domains if empty
  const domainCount = db.prepare('SELECT COUNT(*) as count FROM blocked_domains').get() as { count: number }
  if (domainCount.count === 0) {
    console.log('[DB] Seeding default blocked domains...')
    const insertStmt = db.prepare('INSERT INTO blocked_domains (domain, enabled) VALUES (?, 1)')
    const transaction = db.transaction((domains: string[]) => {
      for (const d of domains) {
        insertStmt.run(d)
      }
    })
    transaction(DEFAULT_BLOCKED_DOMAINS)
  }

  // Seed blacklisted_apps if empty
  const appCount = db.prepare('SELECT COUNT(*) as count FROM blacklisted_apps').get() as { count: number }
  if (appCount.count === 0) {
    console.log('[DB] Seeding default blacklisted apps...')
    const insertStmt = db.prepare('INSERT INTO blacklisted_apps (app_name, is_enabled) VALUES (?, 1)')
    const transaction = db.transaction((apps: string[]) => {
      for (const a of apps) {
        insertStmt.run(a)
      }
    })
    transaction(DEFAULT_BLACKLISTED_APPS)
  }

  console.log('[DB] Database initialized, schema ready')
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}

import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { DEFAULT_BLOCKED_DOMAINS } from '../blocking/blockedDomainsList'

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

  // Seed blocked_domains if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM blocked_domains').get() as { count: number }
  if (countRow.count === 0) {
    console.log('[DB] Seeding default blocked domains...')
    const insertStmt = db.prepare('INSERT INTO blocked_domains (domain, enabled) VALUES (?, 1)')
    // Seed using a transaction for efficiency
    const transaction = db.transaction((domains: string[]) => {
      for (const d of domains) {
        insertStmt.run(d)
      }
    })
    transaction(DEFAULT_BLOCKED_DOMAINS)
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

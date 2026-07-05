import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

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

  /*
   * session_type is NULLABLE by design:
   *   Pomodoro sessions have a type ('focus' | 'shortBreak' | 'longBreak').
   *   Standard sessions are open-ended and do not have a type — they are
   *   simply "focus work" without a predefined structure. Setting this to
   *   NULL for standard rows avoids inventing a meaningless label.
   *
   * duration_planned_sec is NULLABLE by design:
   *   Pomodoro sessions always have a planned duration (e.g. 1500s for 25min).
   *   Standard sessions are open-ended with no target duration — storing NULL
   *   correctly represents "there was no plan" vs storing 0 which would
   *   incorrectly imply "planned for zero seconds".
   *
   * end_reason tracks HOW the session ended:
   *   'auto_complete' — pomodoro countdown reached 0:00
   *   'manual_stop'   — user clicked Stop (primary way standard sessions end)
   *   'abandoned'     — user reset/aborted before completion
   *   'force_ended'   — Phase 4 buffer engine detected sustained distraction
   *                      (reserved value, not reachable yet)
   *
   * This is a fresh schema on Day 4. No existing data needs migration.
   * The nullability of session_type and duration_planned_sec does not break
   * any prior constraints because no rows exist yet.
   */

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

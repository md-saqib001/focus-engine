import { ipcMain } from 'electron'
import {
  createSession,
  completeSession,
  getAllSessions
} from '../database/sessionRepository'

/**
 * Registers all session-related IPC handlers.
 * Called once during app initialization in main/index.ts.
 */
export function registerSessionHandlers(): void {
  // session:create — creates a new session row in the database
  ipcMain.handle(
    'session:create',
    async (
      _event,
      args: {
        mode: 'pomodoro' | 'standard'
        sessionType: 'focus' | 'shortBreak' | 'longBreak' | null
        durationPlannedSec: number | null
      }
    ) => {
      try {
        const session = createSession(args.mode, args.sessionType, args.durationPlannedSec)
        return { success: true, data: session }
      } catch (error) {
        console.error('[IPC session:create]', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // session:complete — marks a session as completed/abandoned
  ipcMain.handle(
    'session:complete',
    async (
      _event,
      args: {
        sessionId: string
        durationActualSec: number
        completed: boolean
        endReason: 'auto_complete' | 'manual_stop' | 'abandoned' | 'force_ended'
      }
    ) => {
      try {
        const session = completeSession(
          args.sessionId,
          args.durationActualSec,
          args.completed,
          args.endReason
        )
        return { success: true, data: session }
      } catch (error) {
        console.error('[IPC session:complete]', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // session:getAll — fetches all sessions ordered by most recent first
  ipcMain.handle('session:getAll', async () => {
    try {
      const sessions = getAllSessions()
      return { success: true, data: sessions }
    } catch (error) {
      console.error('[IPC session:getAll]', error)
      return { success: false, error: String(error) }
    }
  })
}

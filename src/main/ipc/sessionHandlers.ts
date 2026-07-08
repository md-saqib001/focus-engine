import { ipcMain } from 'electron'
import {
  saveSession,
  getAllSessions
} from '../database/sessionRepository'

/**
 * Registers all session-related IPC handlers.
 * Called once during app initialization in main/index.ts.
 */
export function registerSessionHandlers(): void {
  // session:save — persists a finalized session row in the database
  ipcMain.handle(
    'session:save',
    async (
      _event,
      args: {
        sessionId: string
        mode: 'pomodoro' | 'standard'
        sessionType: 'focus' | 'shortBreak' | 'longBreak' | null
        startTime: number
        endTime: number
        durationPlannedSec: number | null
        durationActualSec: number
        completed: boolean
        endReason: 'auto_complete' | 'manual_stop' | 'abandoned' | 'force_ended'
        autoPausedCount?: number
      }
    ) => {
      try {
        const session = saveSession(args)
        return { success: true, data: session }
      } catch (error) {
        console.error('[IPC session:save]', error)
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

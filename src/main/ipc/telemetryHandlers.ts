import { ipcMain } from 'electron'
import { telemetryPoller } from '../telemetry/telemetryPoller'
import { getWindowFocusHistory, getCategoryBreakdown } from '../database/windowFocusRepository'

export function registerTelemetryHandlers(): void {
  // telemetry:start — starts telemetry window tracking
  ipcMain.handle(
    'telemetry:start',
    async (_event, args: { sessionId: string }) => {
      try {
        telemetryPoller.start(args.sessionId)
        return { success: true }
      } catch (error: any) {
        console.error('[IPC telemetry:start]', error)
        return { success: false, error: error.message || String(error) }
      }
    }
  )

  // telemetry:stop — stops telemetry window tracking
  ipcMain.handle('telemetry:stop', async () => {
    try {
      telemetryPoller.stop()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC telemetry:stop]', error)
      return { success: false, error: error.message || String(error) }
    }
  })

  // telemetry:getWindowHistory — retrieves full focus telemetry list for a session
  ipcMain.handle(
    'telemetry:getWindowHistory',
    async (_event, args: { sessionId: string }) => {
      try {
        const history = getWindowFocusHistory(args.sessionId)
        return { success: true, data: history }
      } catch (error: any) {
        console.error('[IPC telemetry:getWindowHistory]', error)
        return { success: false, error: error.message || String(error) }
      }
    }
  )

  // telemetry:getCategoryBreakdown — retrieves grouped breakdown counts for a session
  ipcMain.handle(
    'telemetry:getCategoryBreakdown',
    async (_event, args: { sessionId: string }) => {
      try {
        const breakdown = getCategoryBreakdown(args.sessionId)
        return { success: true, data: breakdown }
      } catch (error: any) {
        console.error('[IPC telemetry:getCategoryBreakdown]', error)
        return { success: false, error: error.message || String(error) }
      }
    }
  )
}

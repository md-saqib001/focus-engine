import { ipcMain } from 'electron'
import { telemetryPoller } from '../telemetry/telemetryPoller'
import { kpmTracker } from '../telemetry/kpmTracker'
import { getWindowFocusHistory, getCategoryBreakdown } from '../database/windowFocusRepository'
import {
  getForSession,
  getAverageKPM,
  getMaxMinKPM
} from '../database/keyboardMetricsRepository'

export function registerTelemetryHandlers(): void {
  // telemetry:start — starts telemetry window tracking + KPM tracking
  ipcMain.handle(
    'telemetry:start',
    async (_event, args: { sessionId: string }) => {
      try {
        telemetryPoller.start(args.sessionId)
        kpmTracker.start(args.sessionId)
        return { success: true }
      } catch (error: any) {
        console.error('[IPC telemetry:start]', error)
        return { success: false, error: error.message || String(error) }
      }
    }
  )

  // telemetry:stop — stops telemetry window tracking + KPM tracking
  ipcMain.handle('telemetry:stop', async () => {
    try {
      telemetryPoller.stop()
      kpmTracker.stop()
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

  // telemetry:startKPM — starts KPM tracking specifically
  ipcMain.handle(
    'telemetry:startKPM',
    async (_event, args: { sessionId: string }) => {
      try {
        kpmTracker.start(args.sessionId)
        return { success: true }
      } catch (error: any) {
        console.error('[IPC telemetry:startKPM]', error)
        return { success: false, error: error.message || String(error) }
      }
    }
  )

  // telemetry:stopKPM — stops KPM tracking specifically
  ipcMain.handle('telemetry:stopKPM', async () => {
    try {
      kpmTracker.stop()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC telemetry:stopKPM]', error)
      return { success: false, error: error.message || String(error) }
    }
  })

  // telemetry:getKPMHistory — retrieves rolling KPM history and calculated session metrics
  ipcMain.handle(
    'telemetry:getKPMHistory',
    async (_event, args: { sessionId: string }) => {
      try {
        const list = getForSession(args.sessionId)
        const avg = getAverageKPM(args.sessionId)
        const bounds = getMaxMinKPM(args.sessionId)
        return {
          success: true,
          data: {
            history: list,
            average: avg,
            maxKpm: bounds.maxKpm,
            minKpm: bounds.minKpm
          }
        }
      } catch (error: any) {
        console.error('[IPC telemetry:getKPMHistory]', error)
        return { success: false, error: error.message || String(error) }
      }
    }
  )
}

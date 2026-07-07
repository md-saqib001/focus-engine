import { ipcMain } from 'electron'
import { pythonCVProcessManager } from '../cv/pythonProcessManager'
import { cvMetricsRepository } from '../database/cvMetricsRepository'
import { settingsRepository } from '../database/settingsRepository'

export function registerCVHandlers(): void {
  ipcMain.handle('cv:start', (_event, sessionId: string, fps?: number) => {
    try {
      pythonCVProcessManager.start(sessionId, fps || 2)
      return { success: true }
    } catch (err: any) {
      console.error('[CV IPC] Failed to start CV engine:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('cv:stop', (_event) => {
    try {
      pythonCVProcessManager.stop()
      return { success: true }
    } catch (err: any) {
      console.error('[CV IPC] Failed to stop CV engine:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('cv:getSummary', (_event, sessionId: string) => {
    try {
      // Ensure summary exists before querying
      cvMetricsRepository.summarizeAndCleanup(sessionId)
      
      const summary = cvMetricsRepository.getCVSummaryForSession(sessionId)
      return { success: true, summary }
    } catch (err: any) {
      console.error('[CV IPC] Failed to get CV summary:', err)
      return { success: false, error: err.message }
    }
  })

  // Settings Handlers
  ipcMain.handle('settings:getCVEnabled', () => {
    try {
      return { success: true, data: settingsRepository.getCVEnabled() }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:setCVEnabled', (_event, enabled: boolean) => {
    try {
      settingsRepository.setCVEnabled(enabled)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:getCVPermission', () => {
    try {
      return { success: true, data: settingsRepository.getCVPermission() }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:setCVPermission', (_event, permission: 'granted' | 'denied' | 'pending') => {
    try {
      settingsRepository.setCVPermission(permission)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:getCalibration', () => {
    try {
      const rawData = settingsRepository.getSetting('cv_calibration', '')
      return { success: true, data: rawData ? JSON.parse(rawData) : null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:setCalibration', (_event, calibration: any) => {
    try {
      settingsRepository.setSetting('cv_calibration', JSON.stringify(calibration))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}

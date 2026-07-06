import { BrowserWindow } from 'electron'
import { getActiveWindow, ActiveWindowInfo } from './activeWindowTracker'
import { insertWindowFocus } from '../database/windowFocusRepository'

export class TelemetryPoller {
  private intervalId: NodeJS.Timeout | null = null
  private currentSessionId: string | null = null

  /**
   * Starts telemetry polling for the active focus session.
   * Runs every 5 seconds.
   */
  public start(sessionId: string): void {
    this.stop() // Safely clear any previous poller first
    this.currentSessionId = sessionId

    const poll = async () => {
      if (!this.currentSessionId) return

      try {
        const activeWindow = await getActiveWindow()
        if (activeWindow && this.currentSessionId) {
          // 1. Insert into database
          insertWindowFocus(
            this.currentSessionId,
            activeWindow.appName,
            activeWindow.windowTitle
          )

          // 2. Broadcast live update to renderer process
          this.broadcastUpdate(activeWindow)
        }
      } catch (err) {
        console.error('[TelemetryPoller] Tick error:', err)
      }
    }

    // Run once immediately, then poll every 5000ms
    poll()
    this.intervalId = setInterval(poll, 5000)
    console.log(`[TelemetryPoller] Started polling for session: ${sessionId}`)
  }

  /**
   * Stops active telemetry polling.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.currentSessionId = null
    console.log('[TelemetryPoller] Stopped polling')
  }

  /**
   * Helper to send IPC event to all open renderer windows.
   */
  private broadcastUpdate(info: ActiveWindowInfo): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('telemetry:activeWindowUpdate', info)
      }
    }
  }
}

// Export a single global instance for orchestration
export const telemetryPoller = new TelemetryPoller()

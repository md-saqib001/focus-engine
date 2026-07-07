import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type SaveSessionArgs =
  | {
      sessionId: string
      mode: 'pomodoro'
      sessionType: 'focus' | 'shortBreak' | 'longBreak'
      startTime: number
      endTime: number
      durationPlannedSec: number
      durationActualSec: number
      completed: boolean
      endReason: 'auto_complete' | 'abandoned'
    }
  | {
      sessionId: string
      mode: 'standard'
      startTime: number
      endTime: number
      durationActualSec: number
      completed: boolean
      endReason: 'manual_stop' | 'force_ended'
    }

// The API exposed to the renderer process via contextBridge
const focusEngineAPI = {
  saveSession: (args: SaveSessionArgs) => {
    if (args.mode === 'pomodoro') {
      return ipcRenderer.invoke('session:save', {
        sessionId: args.sessionId,
        mode: args.mode,
        sessionType: args.sessionType,
        startTime: args.startTime,
        endTime: args.endTime,
        durationPlannedSec: args.durationPlannedSec,
        durationActualSec: args.durationActualSec,
        completed: args.completed,
        endReason: args.endReason
      })
    } else {
      return ipcRenderer.invoke('session:save', {
        sessionId: args.sessionId,
        mode: args.mode,
        sessionType: null,
        startTime: args.startTime,
        endTime: args.endTime,
        durationPlannedSec: null,
        durationActualSec: args.durationActualSec,
        completed: args.completed,
        endReason: args.endReason
      })
    }
  },

  getAllSessions: () => {
    return ipcRenderer.invoke('session:getAll')
  },

  // Hosts blocking endpoints
  startBlocking: () => {
    return ipcRenderer.invoke('blocking:start')
  },

  stopBlocking: () => {
    return ipcRenderer.invoke('blocking:stop')
  },

  isBlockingActive: () => {
    return ipcRenderer.invoke('blocking:status')
  },

  getBlockedDomains: () => {
    return ipcRenderer.invoke('blocking:getDomains')
  },

  addBlockedDomain: (domain: string) => {
    return ipcRenderer.invoke('blocking:addDomain', domain)
  },

  removeBlockedDomain: (domain: string) => {
    return ipcRenderer.invoke('blocking:removeDomain', domain)
  },

  toggleBlockedDomain: (domain: string, enabled: boolean) => {
    return ipcRenderer.invoke('blocking:toggleDomain', { domain, enabled })
  },

  // App blocking endpoints
  killBlacklistedApps: (sessionId: string) => {
    return ipcRenderer.invoke('appBlocking:killBlacklisted', { sessionId })
  },

  getBlacklistedApps: () => {
    return ipcRenderer.invoke('appBlocking:getApps')
  },

  addBlacklistedApp: (appName: string) => {
    return ipcRenderer.invoke('appBlocking:addApp', appName)
  },

  removeBlacklistedApp: (appName: string) => {
    return ipcRenderer.invoke('appBlocking:removeApp', appName)
  },

  toggleBlacklistedApp: (appName: string, enabled: boolean) => {
    return ipcRenderer.invoke('appBlocking:toggleApp', { appName, enabled })
  },

  // Telemetry endpoints
  startTelemetry: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:start', { sessionId })
  },

  stopTelemetry: () => {
    return ipcRenderer.invoke('telemetry:stop')
  },

  getWindowHistory: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:getWindowHistory', { sessionId })
  },

  getCategoryBreakdown: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:getCategoryBreakdown', { sessionId })
  },

  startKPM: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:startKPM', { sessionId })
  },

  stopKPM: () => {
    return ipcRenderer.invoke('telemetry:stopKPM')
  },

  getKPMHistory: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:getKPMHistory', { sessionId })
  },

  startMouse: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:startMouse', { sessionId })
  },

  stopMouse: () => {
    return ipcRenderer.invoke('telemetry:stopMouse')
  },

  getMouseHistory: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:getMouseHistory', { sessionId })
  },

  getSessionSummary: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:getSessionSummary', { sessionId })
  },

  validateSession: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:validateSession', { sessionId })
  },

  getLatestWindow: () => {
    return ipcRenderer.invoke('telemetry:getLatestWindow')
  },

  getLiveMouseCounts: () => {
    return ipcRenderer.invoke('telemetry:getLiveMouseCounts')
  },

  getDistractionEvents: (sessionId: string) => {
    return ipcRenderer.invoke('telemetry:getDistractionEvents', { sessionId })
  },

  onActiveWindowUpdate: (
    callback: (info: {
      appName: string
      windowTitle: string
      domain: string
      category: 'productive' | 'distraction' | 'neutral' | 'unknown'
    }) => void
  ) => {
    const subscription = (
      _event: any,
      data: {
        appName: string
        windowTitle: string
        domain: string
        category: 'productive' | 'distraction' | 'neutral' | 'unknown'
      }
    ) => callback(data)
    ipcRenderer.on('telemetry:activeWindowUpdate', subscription)
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('telemetry:activeWindowUpdate', subscription)
    }
  },

  onKpmUpdate: (callback: (kpm: number) => void) => {
    const subscription = (_event: any, kpm: number) => callback(kpm)
    ipcRenderer.on('telemetry:kpmUpdate', subscription)
    return () => {
      ipcRenderer.removeListener('telemetry:kpmUpdate', subscription)
    }
  },

  onActivityUpdate: (callback: (info: { status: 'Active' | 'Idle'; idleSeconds: number }) => void) => {
    const subscription = (_event: any, data: { status: 'Active' | 'Idle'; idleSeconds: number }) => callback(data)
    ipcRenderer.on('telemetry:activityUpdate', subscription)
    return () => {
      ipcRenderer.removeListener('telemetry:activityUpdate', subscription)
    }
  },

  onDistractionEvent: (callback: (event: { eventType: string; eventData: any; timestamp: number }) => void) => {
    const subscription = (_event: any, data: { eventType: string; eventData: any; timestamp: number }) => callback(data)
    ipcRenderer.on('telemetry:distractionEvent', subscription)
    return () => {
      ipcRenderer.removeListener('telemetry:distractionEvent', subscription)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('focusEngineAPI', focusEngineAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.focusEngineAPI = focusEngineAPI
}

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type SaveSessionArgs =
  | {
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

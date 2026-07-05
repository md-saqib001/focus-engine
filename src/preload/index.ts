import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Discriminated union: TypeScript itself prevents passing a duration for a standard session
type CreateSessionArgs =
  | {
      mode: 'pomodoro'
      sessionType: 'focus' | 'shortBreak' | 'longBreak'
      durationPlannedSec: number
    }
  | {
      mode: 'standard'
    }

interface CompleteSessionArgs {
  sessionId: string
  durationActualSec: number
  completed: boolean
  endReason: 'auto_complete' | 'manual_stop' | 'abandoned' | 'force_ended'
}

// The API exposed to the renderer process via contextBridge
const focusEngineAPI = {
  createSession: (args: CreateSessionArgs) => {
    // Normalize into the flat shape the IPC handler expects
    if (args.mode === 'pomodoro') {
      return ipcRenderer.invoke('session:create', {
        mode: args.mode,
        sessionType: args.sessionType,
        durationPlannedSec: args.durationPlannedSec
      })
    } else {
      return ipcRenderer.invoke('session:create', {
        mode: args.mode,
        sessionType: null,
        durationPlannedSec: null
      })
    }
  },

  completeSession: (args: CompleteSessionArgs) => {
    return ipcRenderer.invoke('session:complete', args)
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

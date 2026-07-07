import { ElectronAPI } from '@electron-toolkit/preload'

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

interface SessionRow {
  session_id: string
  session_mode: 'pomodoro' | 'standard'
  session_type: 'focus' | 'shortBreak' | 'longBreak' | null
  start_time: number
  end_time: number | null
  duration_planned_sec: number | null
  duration_actual_sec: number | null
  completed: number
  end_reason: string | null
  focus_score: number | null
  created_at: number
}

interface BlockedDomainRow {
  domain: string
  enabled: number // 0 or 1
  created_at: number
}

interface BlacklistedAppRow {
  app_name: string
  is_enabled: number // 0 or 1
}

interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface FocusEngineAPI {
  saveSession: (args: SaveSessionArgs) => Promise<IPCResult<SessionRow>>
  getAllSessions: () => Promise<IPCResult<SessionRow[]>>

  // Hosts blocking endpoints
  startBlocking: () => Promise<IPCResult<void>>
  stopBlocking: () => Promise<IPCResult<void>>
  isBlockingActive: () => Promise<IPCResult<boolean>>
  getBlockedDomains: () => Promise<IPCResult<BlockedDomainRow[]>>
  addBlockedDomain: (domain: string) => Promise<IPCResult<void>>
  removeBlockedDomain: (domain: string) => Promise<IPCResult<void>>
  toggleBlockedDomain: (domain: string, enabled: boolean) => Promise<IPCResult<void>>

  // App blocking endpoints
  killBlacklistedApps: (sessionId: string) => Promise<IPCResult<string[]>>
  getBlacklistedApps: () => Promise<IPCResult<BlacklistedAppRow[]>>
  addBlacklistedApp: (appName: string) => Promise<IPCResult<void>>
  removeBlacklistedApp: (appName: string) => Promise<IPCResult<void>>
  toggleBlacklistedApp: (appName: string, enabled: boolean) => Promise<IPCResult<void>>

  // Telemetry endpoints
  startTelemetry: (sessionId: string) => Promise<IPCResult<void>>
  stopTelemetry: () => Promise<IPCResult<void>>
  getWindowHistory: (sessionId: string) => Promise<IPCResult<any[]>>
  getCategoryBreakdown: (sessionId: string) => Promise<IPCResult<any[]>>
  startKPM: (sessionId: string) => Promise<IPCResult<void>>
  stopKPM: () => Promise<IPCResult<void>>
  getKPMHistory: (sessionId: string) => Promise<IPCResult<{
    history: any[]
    average: number
    maxKpm: number
    minKpm: number
  }>>
  startMouse: (sessionId: string) => Promise<IPCResult<void>>
  stopMouse: () => Promise<IPCResult<void>>
  getMouseHistory: (sessionId: string) => Promise<IPCResult<{
    history: any[]
    maxIdleSeconds: number
  }>>
  getSessionSummary: (sessionId: string) => Promise<IPCResult<any>>
  validateSession: (sessionId: string) => Promise<IPCResult<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }>>
  getLatestWindow: () => Promise<IPCResult<{
    appName: string
    windowTitle: string
    domain: string
    category: 'productive' | 'distraction' | 'neutral' | 'unknown'
  } | null>>
  getLiveMouseCounts: () => Promise<IPCResult<{
    clicks: number
    movements: number
  }>>
  getDistractionEvents: (sessionId: string) => Promise<IPCResult<any[]>>
  onActiveWindowUpdate: (
    callback: (info: {
      appName: string
      windowTitle: string
      domain: string
      category: 'productive' | 'distraction' | 'neutral' | 'unknown'
    }) => void
  ) => () => void
  onKpmUpdate: (callback: (kpm: number) => void) => () => void
  onActivityUpdate: (
    callback: (info: {
      status: 'Active' | 'Idle'
      idleSeconds: number
    }) => void
  ) => () => void
  onDistractionEvent: (
    callback: (event: {
      eventType: string
      eventData: any
      timestamp: number
    }) => void
  ) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    focusEngineAPI: FocusEngineAPI
  }
}

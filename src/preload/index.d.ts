import { ElectronAPI } from '@electron-toolkit/preload'

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

interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface FocusEngineAPI {
  saveSession: (args: SaveSessionArgs) => Promise<IPCResult<SessionRow>>
  getAllSessions: () => Promise<IPCResult<SessionRow[]>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    focusEngineAPI: FocusEngineAPI
  }
}

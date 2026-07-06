import { useState, useEffect, useRef, useCallback } from 'react'
import { SessionMode, SessionType, TimerState } from '../types/timer'

export const useTimerEngine = () => {
  const [mode, setMode] = useState<SessionMode>('pomodoro')
  const [state, setState] = useState<TimerState>('idle')
  const [sessionType, setSessionType] = useState<SessionType | null>(null)
  const [blockingError, setBlockingError] = useState<string | null>(null)
  
  // Holds current remaining seconds (pomodoro) or elapsed seconds (standard)
  const [time, setTime] = useState<number>(0)
  
  // Total duration of the current pomodoro session
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(0)

  // Anchor refs to track precise elapsed duration against CPU throttling
  const startTimeRef = useRef<number>(0)
  const accumulatedSecondsRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Track the actual start timestamp of the entire session (set once on start)
  const sessionStartTimeRef = useRef<number>(0)

  // Track a pre-generated session ID to link app termination events
  const sessionIdRef = useRef<string>('')

  // Clear interval helper
  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearIntervalRef()
  }, [clearIntervalRef])

  // Helper: compute total elapsed seconds right now
  const getElapsedSeconds = useCallback((): number => {
    if (startTimeRef.current === 0) return accumulatedSecondsRef.current
    const elapsedSinceLastStart = Math.floor((Date.now() - startTimeRef.current) / 1000)
    return accumulatedSecondsRef.current + elapsedSinceLastStart
  }, [])

  // Core tick updater calculating precise time from Date timestamps
  const tick = useCallback(() => {
    const totalElapsedSeconds = getElapsedSeconds()

    if (mode === 'pomodoro') {
      const remaining = totalDurationSeconds - totalElapsedSeconds
      if (remaining <= 0) {
        clearIntervalRef()
        setTime(0)
        setState('completed')
        
        // Stop website blocking
        if (sessionType === 'focus') {
          window.focusEngineAPI.stopBlocking().catch((err) => console.error('[useTimerEngine] stopBlocking failed:', err))
        }

        // Write finalized Pomodoro session to SQLite
        if (sessionType) {
          window.focusEngineAPI.saveSession({
            sessionId: sessionIdRef.current,
            mode: 'pomodoro',
            sessionType,
            startTime: sessionStartTimeRef.current,
            endTime: Date.now(),
            durationPlannedSec: totalDurationSeconds,
            durationActualSec: totalDurationSeconds,
            completed: true,
            endReason: 'auto_complete'
          }).catch((err) => console.error('[useTimerEngine] Save failed:', err))
        }
      } else {
        setTime(remaining)
      }
    } else {
      setTime(totalElapsedSeconds)
    }
  }, [mode, totalDurationSeconds, sessionType, clearIntervalRef, getElapsedSeconds])

  // Start standard mode (stopwatch)
  const startStandard = useCallback(async () => {
    clearIntervalRef()
    setMode('standard')
    setSessionType(null)
    setState('running')
    setBlockingError(null)
    
    const now = Date.now()
    sessionStartTimeRef.current = now
    startTimeRef.current = now
    accumulatedSecondsRef.current = 0
    setTime(0)
    setTotalDurationSeconds(0)

    // Pre-generate session ID to link logged app kill events
    sessionIdRef.current = crypto.randomUUID()

    // Trigger website blocking for standard focus session
    try {
      const res = await window.focusEngineAPI.startBlocking()
      if (!res.success && res.error) {
        setBlockingError(res.error)
      }
    } catch (err: any) {
      setBlockingError(err.message || String(err))
    }

    // Trigger blacklisted apps termination immediately
    window.focusEngineAPI.killBlacklistedApps(sessionIdRef.current).catch((err) => {
      console.error('[useTimerEngine] App blocking failed:', err)
    })

    intervalRef.current = setInterval(tick, 200)
  }, [clearIntervalRef, tick])

  // Start pomodoro mode (countdown)
  const startPomodoro = useCallback(async (type: SessionType, durationMinutes: number) => {
    clearIntervalRef()
    setMode('pomodoro')
    setSessionType(type)
    setState('running')
    setBlockingError(null)
    
    const durationSeconds = durationMinutes * 60
    const now = Date.now()
    sessionStartTimeRef.current = now
    startTimeRef.current = now
    accumulatedSecondsRef.current = 0
    setTime(durationSeconds)
    setTotalDurationSeconds(durationSeconds)

    // Pre-generate session ID
    sessionIdRef.current = crypto.randomUUID()

    // Trigger website blocking and app termination ONLY if this is a focus session (not a break)
    if (type === 'focus') {
      try {
        const res = await window.focusEngineAPI.startBlocking()
        if (!res.success && res.error) {
          setBlockingError(res.error)
        }
      } catch (err: any) {
        setBlockingError(err.message || String(err))
      }

      window.focusEngineAPI.killBlacklistedApps(sessionIdRef.current).catch((err) => {
        console.error('[useTimerEngine] App blocking failed:', err)
      })
    }

    intervalRef.current = setInterval(tick, 200)
  }, [clearIntervalRef, tick])

  // Pause session
  const pause = useCallback(() => {
    if (state !== 'running') return
    clearIntervalRef()
    
    const elapsedSinceLastStart = Math.floor((Date.now() - startTimeRef.current) / 1000)
    accumulatedSecondsRef.current += elapsedSinceLastStart
    startTimeRef.current = 0
    
    setState('paused')
  }, [state, clearIntervalRef])

  // Resume session
  const resume = useCallback(() => {
    if (state !== 'paused') return
    setState('running')

    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(tick, 200)
  }, [state, clearIntervalRef, tick])

  // Manual end / Stop session — standard mode only
  const stop = useCallback(() => {
    clearIntervalRef()
    const actualDuration = getElapsedSeconds()
    setState('completed')

    // Stop website blocking
    window.focusEngineAPI.stopBlocking().catch((err) => console.error('[useTimerEngine] stopBlocking failed:', err))

    // Save finalized Standard session to SQLite
    window.focusEngineAPI.saveSession({
      sessionId: sessionIdRef.current,
      mode: 'standard',
      startTime: sessionStartTimeRef.current,
      endTime: Date.now(),
      durationActualSec: actualDuration,
      completed: true,
      endReason: 'manual_stop'
    }).catch((err) => console.error('[useTimerEngine] Save failed:', err))
  }, [clearIntervalRef, getElapsedSeconds])

  // Reset / Abort session — pomodoro only
  const reset = useCallback(() => {
    clearIntervalRef()
    const actualDuration = getElapsedSeconds()

    // Stop website blocking
    if (sessionType === 'focus') {
      window.focusEngineAPI.stopBlocking().catch((err) => console.error('[useTimerEngine] stopBlocking failed:', err))
    }

    // If a pomodoro session was active/paused, save it as abandoned
    if (mode === 'pomodoro' && (state === 'running' || state === 'paused') && sessionType) {
      window.focusEngineAPI.saveSession({
        sessionId: sessionIdRef.current,
        mode: 'pomodoro',
        sessionType,
        startTime: sessionStartTimeRef.current,
        endTime: Date.now(),
        durationPlannedSec: totalDurationSeconds,
        durationActualSec: actualDuration,
        completed: false,
        endReason: 'abandoned'
      }).catch((err) => console.error('[useTimerEngine] Save failed:', err))
    }

    setState('idle')
    setTime(0)
    setTotalDurationSeconds(0)
    accumulatedSecondsRef.current = 0
    startTimeRef.current = 0
    sessionStartTimeRef.current = 0
    sessionIdRef.current = ''
    setBlockingError(null)
  }, [mode, state, sessionType, totalDurationSeconds, clearIntervalRef, getElapsedSeconds])

  // TODO Phase 4: buffer engine distraction trigger
  const forceEnd = useCallback((reason: string) => {
    console.warn(`Session force-ended: ${reason}`)
    clearIntervalRef()
    const actualDuration = getElapsedSeconds()
    setState('completed')

    // Stop website blocking
    window.focusEngineAPI.stopBlocking().catch((err) => console.error('[useTimerEngine] stopBlocking failed:', err))

    if (mode === 'standard') {
      window.focusEngineAPI.saveSession({
        sessionId: sessionIdRef.current,
        mode: 'standard',
        startTime: sessionStartTimeRef.current,
        endTime: Date.now(),
        durationActualSec: actualDuration,
        completed: false,
        endReason: 'force_ended'
      }).catch((err) => console.error('[useTimerEngine] Save failed:', err))
    }
  }, [mode, clearIntervalRef, getElapsedSeconds])

  // Minutes and seconds elapsed or remaining
  const minutes = Math.floor(time / 60)
  const seconds = time % 60

  const progress = mode === 'pomodoro' && totalDurationSeconds > 0 
    ? time / totalDurationSeconds 
    : null

  return {
    mode,
    setMode,
    state,
    sessionType,
    minutesElapsedOrRemaining: minutes,
    secondsElapsedOrRemaining: seconds,
    progress,
    blockingError,
    startPomodoro,
    startStandard,
    pause,
    resume,
    stop,
    reset,
    forceEnd
  }
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { SessionMode, SessionType, TimerState } from '../types/timer'

export const useTimerEngine = () => {
  const [mode, setMode] = useState<SessionMode>('pomodoro')
  const [state, setState] = useState<TimerState>('idle')
  const [sessionType, setSessionType] = useState<SessionType | null>(null)
  
  // Holds current remaining seconds (pomodoro) or elapsed seconds (standard)
  const [time, setTime] = useState<number>(0)
  
  // Total duration of the current pomodoro session
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(0)

  // Timestamps and elapsed trackers to combat Chromium interval throttling
  const startTimeRef = useRef<number>(0)
  const accumulatedSecondsRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Track the current session's DB ID for completing it later
  const sessionIdRef = useRef<string | null>(null)

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
        // Pomodoro auto-completion: persist to DB
        if (sessionIdRef.current) {
          window.focusEngineAPI.completeSession({
            sessionId: sessionIdRef.current,
            durationActualSec: totalDurationSeconds,
            completed: true,
            endReason: 'auto_complete'
          })
          sessionIdRef.current = null
        }
      } else {
        setTime(remaining)
      }
    } else {
      setTime(totalElapsedSeconds)
    }
  }, [mode, totalDurationSeconds, clearIntervalRef, getElapsedSeconds])

  // Start standard mode (stopwatch)
  const startStandard = useCallback(async () => {
    clearIntervalRef()
    setMode('standard')
    setSessionType(null)
    setState('running')
    
    startTimeRef.current = Date.now()
    accumulatedSecondsRef.current = 0
    setTime(0)
    setTotalDurationSeconds(0)

    // Persist session creation to DB
    try {
      const result = await window.focusEngineAPI.createSession({ mode: 'standard' })
      if (result.success && result.data) {
        sessionIdRef.current = result.data.session_id
      }
    } catch (err) {
      console.error('[useTimerEngine] Failed to create standard session:', err)
    }

    intervalRef.current = setInterval(tick, 200)
  }, [clearIntervalRef, tick])

  // Start pomodoro mode (countdown)
  const startPomodoro = useCallback(async (type: SessionType, durationMinutes: number) => {
    clearIntervalRef()
    setMode('pomodoro')
    setSessionType(type)
    setState('running')
    
    const durationSeconds = durationMinutes * 60
    startTimeRef.current = Date.now()
    accumulatedSecondsRef.current = 0
    setTime(durationSeconds)
    setTotalDurationSeconds(durationSeconds)

    // Persist session creation to DB
    try {
      const result = await window.focusEngineAPI.createSession({
        mode: 'pomodoro',
        sessionType: type,
        durationPlannedSec: durationSeconds
      })
      if (result.success && result.data) {
        sessionIdRef.current = result.data.session_id
      }
    } catch (err) {
      console.error('[useTimerEngine] Failed to create pomodoro session:', err)
    }

    intervalRef.current = setInterval(tick, 200)
  }, [clearIntervalRef, tick])

  // Pause session
  const pause = useCallback(() => {
    if (state !== 'running') return
    clearIntervalRef()
    
    // Save accumulated elapsed seconds before clearing
    const elapsedSinceLastStart = Math.floor((Date.now() - startTimeRef.current) / 1000)
    accumulatedSecondsRef.current += elapsedSinceLastStart
    
    setState('paused')
  }, [state, clearIntervalRef])

  // Resume session
  const resume = useCallback(() => {
    if (state !== 'paused') return
    setState('running')

    // Reset start anchor to now
    startTimeRef.current = Date.now()
    
    intervalRef.current = setInterval(tick, 200)
  }, [state, tick])

  // Manual end / Stop session — primary way to end a standard session
  const stop = useCallback(() => {
    clearIntervalRef()
    const actualDuration = getElapsedSeconds()
    setState('completed')

    // Persist to DB: manual stop
    if (sessionIdRef.current) {
      window.focusEngineAPI.completeSession({
        sessionId: sessionIdRef.current,
        durationActualSec: actualDuration,
        completed: true,
        endReason: 'manual_stop'
      })
      sessionIdRef.current = null
    }
  }, [clearIntervalRef, getElapsedSeconds])

  // Reset / Abort session — pomodoro only (standard doesn't show Reset)
  const reset = useCallback(() => {
    clearIntervalRef()
    const actualDuration = getElapsedSeconds()

    // If a session was in progress, mark it as abandoned in the DB
    if (sessionIdRef.current && (state === 'running' || state === 'paused')) {
      window.focusEngineAPI.completeSession({
        sessionId: sessionIdRef.current,
        durationActualSec: actualDuration,
        completed: false,
        endReason: 'abandoned'
      })
      sessionIdRef.current = null
    }

    setState('idle')
    setTime(0)
    setTotalDurationSeconds(0)
    accumulatedSecondsRef.current = 0
    startTimeRef.current = 0
  }, [clearIntervalRef, getElapsedSeconds, state])

  // TODO Phase 4: buffer engine will call forceEnd(reason) here when sustained
  // distraction is detected during a standard-mode session.
  // The hook shape is ready so Day 33 doesn't require restructuring this file.
  const forceEnd = useCallback((reason: string) => {
    console.warn(`Session force-ended: ${reason}`)
    clearIntervalRef()
    const actualDuration = getElapsedSeconds()
    setState('completed')

    if (sessionIdRef.current) {
      window.focusEngineAPI.completeSession({
        sessionId: sessionIdRef.current,
        durationActualSec: actualDuration,
        completed: false,
        endReason: 'force_ended'
      })
      sessionIdRef.current = null
    }
  }, [clearIntervalRef, getElapsedSeconds])

  // Minutes and seconds elapsed or remaining
  const minutes = Math.floor(time / 60)
  const seconds = time % 60

  // Progress ratio (0 to 1) for the progress circle in Pomodoro mode
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
    startPomodoro,
    startStandard,
    pause,
    resume,
    stop,
    reset,
    forceEnd
  }
}

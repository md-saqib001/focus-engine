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

  // Core tick updater calculating precise time from Date timestamps
  const tick = useCallback(() => {
    const elapsedSinceLastStart = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const totalElapsedSeconds = accumulatedSecondsRef.current + elapsedSinceLastStart

    if (mode === 'pomodoro') {
      const remaining = totalDurationSeconds - totalElapsedSeconds
      if (remaining <= 0) {
        clearIntervalRef()
        setTime(0)
        setState('completed')
      } else {
        setTime(remaining)
      }
    } else {
      setTime(totalElapsedSeconds)
    }
  }, [mode, totalDurationSeconds, clearIntervalRef])

  // Start standard mode (stopwatch)
  const startStandard = useCallback(() => {
    clearIntervalRef()
    setMode('standard')
    setSessionType(null)
    setState('running')
    
    startTimeRef.current = Date.now()
    accumulatedSecondsRef.current = 0
    setTime(0)
    setTotalDurationSeconds(0)

    intervalRef.current = setInterval(tick, 200) // fast tick for UI responsiveness
  }, [clearIntervalRef, tick])

  // Start pomodoro mode (countdown)
  const startPomodoro = useCallback((type: SessionType, durationMinutes: number) => {
    clearIntervalRef()
    setMode('pomodoro')
    setSessionType(type)
    setState('running')
    
    const durationSeconds = durationMinutes * 60
    startTimeRef.current = Date.now()
    accumulatedSecondsRef.current = 0
    setTime(durationSeconds)
    setTotalDurationSeconds(durationSeconds)

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
  }, [state, clearIntervalRef, tick])

  // Manual end / Stop session
  const stop = useCallback(() => {
    clearIntervalRef()
    setState('completed')
  }, [clearIntervalRef])

  // Reset / Abort session
  const reset = useCallback(() => {
    clearIntervalRef()
    setState('idle')
    setTime(0)
    setTotalDurationSeconds(0)
    accumulatedSecondsRef.current = 0
    startTimeRef.current = 0
  }, [clearIntervalRef])

  // TODO Phase 4: buffer engine will call an internal forceEnd(reason) here when sustained
  // distraction is detected during a standard-mode session.
  const forceEnd = useCallback((reason: string) => {
    console.warn(`Session force-ended: ${reason}`)
    clearIntervalRef()
    setState('completed')
  }, [clearIntervalRef])

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

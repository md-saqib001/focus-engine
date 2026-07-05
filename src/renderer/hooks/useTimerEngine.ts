import { useState, useEffect, useRef, useCallback } from 'react'
import { SessionMode, SessionType, TimerState } from '../types/timer'

export const useTimerEngine = () => {
  const [mode, setMode] = useState<SessionMode>('pomodoro')
  const [state, setState] = useState<TimerState>('idle')
  const [sessionType, setSessionType] = useState<SessionType | null>(null)
  
  // Holds remaining seconds (pomodoro) or elapsed seconds (standard)
  const [time, setTime] = useState<number>(0)
  
  // Total duration of the current pomodoro session (for progress calculation)
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(0)

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

  // Start standard mode (stopwatch)
  const startStandard = useCallback(() => {
    clearIntervalRef()
    setMode('standard')
    setSessionType(null)
    setState('running')
    setTime(0)
    setTotalDurationSeconds(0)

    intervalRef.current = setInterval(() => {
      setTime((prevTime) => prevTime + 1)
    }, 1000)
  }, [clearIntervalRef])

  // Start pomodoro mode (countdown)
  const startPomodoro = useCallback((type: SessionType, durationMinutes: number) => {
    clearIntervalRef()
    setMode('pomodoro')
    setSessionType(type)
    setState('running')
    
    const durationSeconds = durationMinutes * 60
    setTime(durationSeconds)
    setTotalDurationSeconds(durationSeconds)

    intervalRef.current = setInterval(() => {
      setTime((prevTime) => {
        if (prevTime <= 1) {
          clearIntervalRef()
          setState('completed')
          return 0
        }
        return prevTime - 1
      })
    }, 1000)
  }, [clearIntervalRef])

  // Pause session
  const pause = useCallback(() => {
    if (state !== 'running') return
    clearIntervalRef()
    setState('paused')
  }, [state, clearIntervalRef])

  // Resume session
  const resume = useCallback(() => {
    if (state !== 'paused') return
    setState('running')

    intervalRef.current = setInterval(() => {
      if (mode === 'pomodoro') {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            clearIntervalRef()
            setState('completed')
            return 0
          }
          return prevTime - 1
        })
      } else {
        setTime((prevTime) => prevTime + 1)
      }
    }, 1000)
  }, [mode, state, clearIntervalRef])

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
    // Keep mode and sessionType selection for re-start usability
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

  // Progress is only meaningful in pomodoro mode (a ratio from 0 to 1).
  // In standard mode, there is no set total duration, so progress does not exist (null).
  const progress = mode === 'pomodoro' && totalDurationSeconds > 0 
    ? time / totalDurationSeconds 
    : null

  return {
    mode,
    setMode, // exposed so the idle user can toggle mode
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
    forceEnd // placeholder hook shape for Phase 4
  }
}

import React, { useState, useEffect } from 'react'
import { Card, TimerDisplay, Button } from '@/components/ui'
import { useTimerEngine } from '../hooks/useTimerEngine'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { SessionType } from '../types/timer'

const Dashboard: React.FC = () => {
  const {
    mode,
    setMode,
    state,
    minutesElapsedOrRemaining,
    secondsElapsedOrRemaining,
    progress,
    startPomodoro,
    startStandard,
    pause,
    resume,
    stop,
    reset
  } = useTimerEngine()

  // Selected session type for Pomodoro mode (defaults to focus)
  const [selectedType, setSelectedType] = useState<SessionType>('focus')
  
  // Custom durations (configurable)
  const [durations] = useState({
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  })

  // Visual flash state when session completes
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (state === 'completed') {
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state])

  const handleStart = (): void => {
    if (mode === 'pomodoro') {
      startPomodoro(selectedType, durations[selectedType])
    } else {
      startStandard()
    }
  }

  return (
    <div
      style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        animation: flash ? 'flashEffect 0.5s ease-out 4' : 'none'
      }}
    >
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Manage and monitor your active session.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Card title="Focus Session" style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '12px 0' }}>
            
            {/* Mode Selector (Only visible when idle or completed) */}
            {(state === 'idle' || state === 'completed') && (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#0f0f17',
                  borderRadius: '12px',
                  padding: '4px',
                  border: '1px solid #232336',
                  width: '100%'
                }}
              >
                <button
                  onClick={() => {
                    setMode('pomodoro')
                    reset()
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '8px',
                    backgroundColor: mode === 'pomodoro' ? '#181824' : 'transparent',
                    color: mode === 'pomodoro' ? '#818cf8' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: mode === 'pomodoro' ? '1px solid #2e2e48' : '1px solid transparent'
                  }}
                >
                  Pomodoro
                </button>
                <button
                  onClick={() => {
                    setMode('standard')
                    reset()
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '8px',
                    backgroundColor: mode === 'standard' ? '#181824' : 'transparent',
                    color: mode === 'standard' ? '#818cf8' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: mode === 'standard' ? '1px solid #2e2e48' : '1px solid transparent'
                  }}
                >
                  Standard (Open-Ended)
                </button>
              </div>
            )}

            {/* Pomodoro Session Type Selector (Only visible in pomodoro mode when idle/completed) */}
            {mode === 'pomodoro' && (state === 'idle' || state === 'completed') && (
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                {(['focus', 'shortBreak', 'longBreak'] as SessionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type)
                      reset()
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '8px',
                      backgroundColor: selectedType === type ? '#232336' : 'transparent',
                      color: selectedType === type ? '#ffffff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: selectedType === type ? '1px solid #2e2e48' : '1px solid #1c1c2b'
                    }}
                  >
                    {type === 'focus' ? 'Focus' : type === 'shortBreak' ? 'Short' : 'Long'}
                  </button>
                ))}
              </div>
            )}

            {/* Timer Display */}
            <TimerDisplay
              minutes={
                state === 'idle' && mode === 'pomodoro'
                  ? durations[selectedType]
                  : minutesElapsedOrRemaining
              }
              seconds={state === 'idle' ? 0 : secondsElapsedOrRemaining}
              state={state}
              mode={mode}
              progress={progress}
            />

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
              {state === 'idle' || state === 'completed' ? (
                <Button variant="primary" size="md" onClick={handleStart} style={{ width: '160px' }}>
                  <Play size={16} fill="currentColor" />
                  <span>Start Session</span>
                </Button>
              ) : (
                <>
                  {state === 'running' ? (
                    <Button variant="secondary" size="md" onClick={pause}>
                      <Pause size={16} fill="currentColor" />
                      <span>Pause</span>
                    </Button>
                  ) : (
                    <Button variant="primary" size="md" onClick={resume}>
                      <Play size={16} fill="currentColor" />
                      <span>Resume</span>
                    </Button>
                  )}

                  {/* Mode-Specific End Actions */}
                  {mode === 'pomodoro' ? (
                    <Button variant="ghost" size="md" onClick={reset}>
                      <RotateCcw size={16} />
                      <span>Reset</span>
                    </Button>
                  ) : (
                    <Button variant="danger" size="md" onClick={stop}>
                      <Square size={16} fill="currentColor" />
                      <span>Stop</span>
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Status notice when completed */}
            {state === 'completed' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#10b981',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '4px'
                }}
              >
                <span>✓ Session Completed Successfully!</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes flashEffect {
          0% { background-color: #0f0f17; }
          50% { background-color: rgba(129, 140, 248, 0.15); }
          100% { background-color: #0f0f17; }
        }
      `}</style>
    </div>
  )
}

export default Dashboard

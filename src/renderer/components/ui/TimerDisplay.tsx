import React from 'react'

export interface TimerDisplayProps {
  minutes: number
  seconds: number
  state: 'idle' | 'running' | 'paused'
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ minutes, seconds, state }) => {
  // Format MM:SS with leading zeroes
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(seconds).padStart(2, '0')

  // Colors based on state
  const getStateColor = (): string => {
    switch (state) {
      case 'running':
        return '#818cf8' // Accent purple
      case 'paused':
        return '#f59e0b' // Amber
      case 'idle':
      default:
        return '#64748b' // Grey
    }
  }

  const color = getStateColor()

  // SVG Circular progress configurations
  const radius = 90
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  
  // Calculate progress based on a standard 25-minute session for visual estimation
  const totalSeconds = 25 * 60
  const currentSeconds = minutes * 60 + seconds
  const ratio = totalSeconds > 0 ? currentSeconds / totalSeconds : 1
  const strokeDashoffset = circumference - ratio * circumference

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '220px',
        height: '220px',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Progress SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 200"
        style={{
          transform: 'rotate(-90deg)',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {/* Background Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="transparent"
          stroke="#1e1e2f"
          strokeWidth={strokeWidth}
        />
        {/* Foreground Circle representing progress */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease'
          }}
        />
      </svg>

      {/* Timer Text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      >
        <span
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: '#f8fafc',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: '-1px'
          }}
        >
          {formattedMinutes}:{formattedSeconds}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: color,
            letterSpacing: '1.5px',
            marginTop: '4px',
            transition: 'color 0.3s ease'
          }}
        >
          {state}
        </span>
      </div>
    </div>
  )
}

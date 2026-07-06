import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui'
import { RefreshCw } from 'lucide-react'

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
  apps_killed?: number
}

const History: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await window.focusEngineAPI.getAllSessions()
      if (result.success && result.data) {
        setSessions(result.data)
      }
    } catch (err) {
      console.error('[History] Failed to fetch sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}h ${m}m ${s}s`
    }
    return `${m}m ${s}s`
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatSessionType = (type: string | null): string => {
    if (type === null) return '—'
    switch (type) {
      case 'focus': return 'Focus'
      case 'shortBreak': return 'Short Break'
      case 'longBreak': return 'Long Break'
      default: return type
    }
  }

  const formatEndReason = (reason: string | null): string => {
    if (reason === null) return '—'
    switch (reason) {
      case 'auto_complete': return 'Completed Automatically'
      case 'manual_stop': return 'Stopped Manually'
      case 'abandoned': return 'Abandoned early'
      case 'force_ended': return 'Force Ended'
      default: return reason
    }
  }

  const getEndReasonColor = (reason: string | null): string => {
    switch (reason) {
      case 'auto_complete': return '#10b981'
      case 'manual_stop': return '#10b981' // Manual stop in standard counts as success
      case 'abandoned': return '#f59e0b'
      case 'force_ended': return '#ef4444'
      default: return '#64748b'
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #272738'
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: '13px',
    color: '#94a3b8',
    borderBottom: '1px solid #1e1e2f'
  }

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>Session History</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={fetchSessions}
          style={{
            background: 'transparent',
            border: '1px solid #272738',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '14px' }}>
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '14px' }}>
            No sessions yet. Start a focus session from the Dashboard!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Mode</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Apps Killed</th>
                  <th style={thStyle}>Completed</th>
                  <th style={thStyle}>End Reason</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.session_id}>
                    <td style={tdStyle}>
                      {formatDate(session.start_time)}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: session.session_mode === 'pomodoro' ? 'rgba(129, 140, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: session.session_mode === 'pomodoro' ? '#818cf8' : '#10b981',
                          textTransform: 'capitalize'
                        }}
                      >
                        {session.session_mode}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {formatSessionType(session.session_type)}
                    </td>
                    <td style={tdStyle}>
                      {formatDuration(session.duration_actual_sec)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: (session.apps_killed ?? 0) > 0 ? '#818cf8' : '#64748b' }}>
                        {session.apps_killed ?? 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: session.completed ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        {session.completed ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: getEndReasonColor(session.end_reason), fontWeight: 550 }}>
                        {formatEndReason(session.end_reason)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default History

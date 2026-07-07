import React, { useState, useEffect } from 'react'
import { Card, Button } from '@/components/ui'
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

interface SessionRow {
  session_id: string
  session_mode: string
  session_type: string | null
  start_time: number
  duration_actual_sec: number | null
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

const Debug: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationErr, setValidationErr] = useState<string | null>(null)

  // Fetch recent sessions on mount for easy selection dropdown
  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await window.focusEngineAPI.getAllSessions()
      if (res.success && res.data) {
        setSessions(res.data)
        if (res.data.length > 0) {
          setSelectedSessionId(res.data[0].session_id)
        }
      }
    } catch (err) {
      console.error('[Debug] Failed to fetch sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleValidate = async () => {
    if (!selectedSessionId.trim()) return

    setValidating(true)
    setValidationResult(null)
    setValidationErr(null)

    try {
      const res = await window.focusEngineAPI.validateSession(selectedSessionId)
      if (res.success && res.data) {
        setValidationResult(res.data)
      } else {
        setValidationErr(res.error || 'Failed to validate session telemetry.')
      }
    } catch (err: any) {
      setValidationErr(err.message || String(err))
    } finally {
      setValidating(false)
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
          Telemetry Diagnostics & Integrity Validator
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Review and audit the completeness of window focus, keyboard, and mouse logs captured across focus sessions.
        </p>
      </div>

      <Card title="Select Session to Audit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Session ID</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#0f0f17',
                  border: '1px solid #232336',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '8px 12px',
                  fontSize: '14px'
                }}
              >
                {sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {new Date(s.start_time).toLocaleString()} ({s.session_mode} - {s.duration_actual_sec || 0}s) [{s.session_id.substring(0, 8)}]
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Enter Session UUID"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                style={{
                  width: '260px',
                  backgroundColor: '#0f0f17',
                  border: '1px solid #232336',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '8px 12px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="primary" onClick={handleValidate} disabled={validating || !selectedSessionId}>
              {validating ? (
                <>
                  <RefreshCw size={16} className="spin" style={{ marginRight: '8px' }} />
                  Auditing Telemetry...
                </>
              ) : (
                'Validate Session Telemetry'
              )}
            </Button>
            <Button variant="ghost" onClick={loadSessions} disabled={loadingSessions}>
              Refresh Sessions
            </Button>
          </div>
        </div>
      </Card>

      {validationErr && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ShieldAlert size={18} />
          <span style={{ fontSize: '14px' }}>{validationErr}</span>
        </div>
      )}

      {validationResult && (
        <Card title="Audit Findings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Status Summary Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: validationResult.isValid && validationResult.warnings.length === 0
                  ? 'rgba(16, 185, 129, 0.08)'
                  : validationResult.isValid
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(239, 68, 68, 0.08)',
                border: `1.5px solid ${
                  validationResult.isValid && validationResult.warnings.length === 0
                    ? '#10b981'
                    : validationResult.isValid
                    ? '#f59e0b'
                    : '#ef4444'
                }`
              }}
            >
              {validationResult.isValid && validationResult.warnings.length === 0 ? (
                <CheckCircle2 size={24} style={{ color: '#10b981' }} />
              ) : validationResult.isValid ? (
                <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              ) : (
                <ShieldAlert size={24} style={{ color: '#ef4444' }} />
              )}
              
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  {validationResult.isValid && validationResult.warnings.length === 0
                    ? 'All Telemetry Validated!'
                    : validationResult.isValid
                    ? 'Validated with Warnings'
                    : 'Telemetry Integrity Failed'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {validationResult.errors.length} errors and {validationResult.warnings.length} warnings detected.
                </div>
              </div>
            </div>

            {/* Error List */}
            {validationResult.errors.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Critical Integrity Errors ({validationResult.errors.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {validationResult.errors.map((err, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#ef4444', lineHeight: '1.4' }}>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning List */}
            {validationResult.warnings.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Warnings ({validationResult.warnings.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {validationResult.warnings.map((warn, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#f59e0b', lineHeight: '1.4' }}>
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.isValid && validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>
                No database inconsistencies or collection gaps detected. This telemetry log is perfect!
              </div>
            )}
          </div>
        </Card>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Debug

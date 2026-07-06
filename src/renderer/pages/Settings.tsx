import React, { useState, useEffect } from 'react'
import { Card, Button } from '@/components/ui'
import { Trash2, Plus, Globe, ShieldAlert } from 'lucide-react'

interface BlockedDomainRow {
  domain: string
  enabled: number // 0 or 1
  created_at: number
}

const Settings: React.FC = () => {
  const [domains, setDomains] = useState<BlockedDomainRow[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDomains = async (): Promise<void> => {
    try {
      const res = await window.focusEngineAPI.getBlockedDomains()
      if (res.success && res.data) {
        setDomains(res.data)
      }
    } catch (err) {
      console.error('[Settings] Get domains error:', err)
    }
  }

  const checkStatus = async (): Promise<void> => {
    try {
      const res = await window.focusEngineAPI.isBlockingActive()
      if (res.success && res.data !== undefined) {
        setActive(res.data)
      }
    } catch (err) {
      console.error('[Settings] Status error:', err)
    }
  }

  useEffect(() => {
    const init = async (): Promise<void> => {
      setLoading(true)
      await Promise.all([fetchDomains(), checkStatus()])
      setLoading(false)
    }
    init()
  }, [])

  const handleAddDomain = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    const clean = newDomain.trim().toLowerCase()
    if (!clean) return

    if (clean.includes(' ')) {
      setError('Domain cannot contain spaces')
      return
    }

    try {
      const res = await window.focusEngineAPI.addBlockedDomain(clean)
      if (res.success) {
        setNewDomain('')
        await fetchDomains()
        // If blocking is currently active, refresh the hosts file automatically
        if (active) {
          await window.focusEngineAPI.startBlocking()
        }
      } else {
        setError(res.error || 'Failed to add domain')
      }
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }

  const handleRemoveDomain = async (domainName: string): Promise<void> => {
    setError(null)
    try {
      const res = await window.focusEngineAPI.removeBlockedDomain(domainName)
      if (res.success) {
        await fetchDomains()
        // If blocking is currently active, refresh the hosts file automatically
        if (active) {
          await window.focusEngineAPI.startBlocking()
        }
      } else {
        setError(res.error || 'Failed to remove domain')
      }
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }

  const handleToggleDomain = async (domainName: string, currentlyEnabled: boolean): Promise<void> => {
    setError(null)
    try {
      const res = await window.focusEngineAPI.toggleBlockedDomain(domainName, !currentlyEnabled)
      if (res.success) {
        await fetchDomains()
        // If blocking is currently active, refresh the hosts file automatically
        if (active) {
          await window.focusEngineAPI.startBlocking()
        }
      } else {
        setError(res.error || 'Failed to toggle domain')
      }
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }

  const handleToggleTestBlocking = async (): Promise<void> => {
    setError(null)
    try {
      if (active) {
        const res = await window.focusEngineAPI.stopBlocking()
        if (res.success) {
          setActive(false)
        } else {
          setError(res.error || 'Failed to stop blocking')
        }
      } else {
        const res = await window.focusEngineAPI.startBlocking()
        if (res.success) {
          setActive(true)
        } else {
          setError(res.error || 'Failed to start blocking')
        }
      }
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>Settings</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Configure your focus settings and domain blocking lists.</p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1.5px dashed #ef4444',
            borderRadius: '12px',
            padding: '16px',
            color: '#fca5a5',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Manual Blocking Test Control */}
      <Card title="Hosts File Blocking Test">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: active ? '#10b981' : '#64748b'
                  }}
                />
                <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>
                  Blocking Status: {active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0 0', lineHeight: '1.5' }}>
                Website blocking updates your system's hosts file to redirect distraction sites. 
                Running a test manually updates this system file.
              </p>
            </div>
            <Button
              variant={active ? 'danger' : 'primary'}
              size="md"
              onClick={handleToggleTestBlocking}
              style={{ minWidth: '160px' }}
            >
              {active ? 'Stop Test' : 'Test Blocking Now'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Domain Blocking Manager */}
      <Card title="Blocked Domains List">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0' }}>
          {/* Add custom domain form */}
          <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="e.g. reddit.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: '#0f0f17',
                border: '1.5px solid #232336',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
            />
            <Button variant="secondary" size="md" type="submit">
              <Plus size={16} />
              <span>Add Domain</span>
            </Button>
          </form>

          {/* Table / list of domains */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
              Loading domains...
            </div>
          ) : domains.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '14px' }}>
              No domains configured. Add one above!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {domains.map((row) => {
                const isEnabled = row.enabled === 1
                return (
                  <div
                    key={row.domain}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: '#0f0f17',
                      border: '1px solid #1e1e2f',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Globe size={16} style={{ color: isEnabled ? '#818cf8' : '#475569' }} />
                      <span style={{ fontSize: '14px', color: isEnabled ? '#f8fafc' : '#64748b', fontWeight: 550 }}>
                        {row.domain}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Custom Switch Toggle */}
                      <button
                        onClick={() => handleToggleDomain(row.domain, isEnabled)}
                        style={{
                          width: '40px',
                          height: '22px',
                          borderRadius: '11px',
                          backgroundColor: isEnabled ? '#818cf8' : '#232336',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s ease',
                          padding: 0
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            position: 'absolute',
                            top: '3px',
                            left: isEnabled ? '21px' : '3px',
                            transition: 'left 0.2s ease'
                          }}
                        />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleRemoveDomain(row.domain)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          borderRadius: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                        title="Delete domain"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default Settings

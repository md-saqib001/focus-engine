import React from 'react'
import { Card, TimerDisplay, Button } from '@/components/ui'
import { Play, Settings } from 'lucide-react'

const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Welcome back. Ready to focus?</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Card title="Focus Session" style={{ width: '100%', maxWidth: '400px' }} className="timer-card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '12px 0' }}>
            <TimerDisplay minutes={25} seconds={0} state="idle" />
            
            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              <Button variant="primary" size="md">
                <Play size={16} fill="currentColor" />
                <span>Start Session</span>
              </Button>
              <Button variant="secondary" size="md">
                <Settings size={16} />
                <span>Settings</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        .timer-card {
          width: 100%;
          max-width: 440px;
        }
      `}</style>
    </div>
  )
}

export default Dashboard

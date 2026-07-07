import React, { useState, useEffect, useRef } from 'react'
import { Button } from './ui'
import { Camera, Check, AlertCircle, Play } from 'lucide-react'

interface CVCalibrationHelperProps {
  onClose: () => void
}

const CVCalibrationHelper: React.FC<CVCalibrationHelperProps> = ({ onClose }) => {
  const [step, setStep] = useState<'intro' | 'warmup' | 'screen' | 'away-prep' | 'away' | 'processing' | 'done' | 'error'>('intro')
  const [countdown, setCountdown] = useState(5)
  const [facePresent, setFacePresent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Data storage
  const screenSamples = useRef<{ yaw: number; pitch: number }[]>([])
  const awaySamples = useRef<{ yaw: number; pitch: number }[]>([])
  const activeStep = useRef<'intro' | 'warmup' | 'screen' | 'away-prep' | 'away' | 'processing' | 'done' | 'error'>('intro')
  const countdownIntervalRef = useRef<any>(null)

  useEffect(() => {
    activeStep.current = step
  }, [step])

  // Handle live CV update subscription
  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    if (step === 'warmup' || step === 'screen' || step === 'away') {
      unsubscribe = window.focusEngineAPI.onCVUpdate((data) => {
        setFacePresent(data.face_present)
        
        if (activeStep.current === 'warmup') {
          // Once a face is detected during warmup, transition to active screen calibration
          if (data.face_present && data.yaw !== null && data.pitch !== null) {
            setStep('screen')
          }
        } else if (data.face_present && data.yaw !== null && data.pitch !== null) {
          const sample = { yaw: data.yaw, pitch: data.pitch }
          if (activeStep.current === 'screen') {
            screenSamples.current.push(sample)
          } else if (activeStep.current === 'away') {
            awaySamples.current.push(sample)
          }
        }
      })
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [step])

  // Manage transitions and countdowns automatically based on step
  useEffect(() => {
    if (step === 'screen') {
      runCountdown(5, () => {
        setStep('away-prep')
      })
    } else if (step === 'away-prep') {
      runCountdown(3, () => {
        setStep('away')
      })
    } else if (step === 'away') {
      runCountdown(5, () => {
        processCalibration()
      })
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [step])

  const startCalibration = async () => {
    try {
      // Clear previous samples
      screenSamples.current = []
      awaySamples.current = []
      
      // Start the CV engine with a special dummy session ID
      await window.focusEngineAPI.startCV('calibration_session', 5) // poll faster (5fps) for calibration
      
      // Set to warmup, waiting for the camera feed and face detection
      setStep('warmup')
    } catch (err: any) {
      console.error('[CVCalibrationHelper] Failed to start calibration process:', err)
      setErrorMsg(err.message || String(err))
      setStep('error')
    }
  }

  const runCountdown = (seconds: number, onComplete: () => void) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    setCountdown(seconds)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const processCalibration = async () => {
    setStep('processing')
    try {
      // Gracefully terminate child process
      await window.focusEngineAPI.stopCV()

      if (screenSamples.current.length === 0) {
        throw new Error('No face samples detected while looking at the screen. Make sure your camera has lighting and is aligned.')
      }
      if (awaySamples.current.length === 0) {
        throw new Error('No face samples detected while looking at your lap/phone. Keep your head in the camera frame even when looking down.')
      }

      // Compute averages
      const avg = (arr: { yaw: number; pitch: number }[]) => {
        const sumYaw = arr.reduce((acc, v) => acc + v.yaw, 0)
        const sumPitch = arr.reduce((acc, v) => acc + v.pitch, 0)
        return {
          yaw: round(sumYaw / arr.length),
          pitch: round(sumPitch / arr.length)
        }
      }

      const screenBaseline = avg(screenSamples.current)
      const awayBaseline = avg(awaySamples.current)

      // Save calibration baselines
      const payload = {
        screen: screenBaseline,
        distract: awayBaseline
      }
      await window.focusEngineAPI.setCalibration(payload)
      setStep('done')
    } catch (err: any) {
      console.error('[CVCalibrationHelper] Processing failed:', err)
      setErrorMsg(err.message || String(err))
      setStep('error')
      // Ensure we always stop the camera on error
      await window.focusEngineAPI.stopCV()
    }
  }

  const round = (val: number) => Math.round(val * 100) / 100

  const handleAbort = async () => {
    await window.focusEngineAPI.stopCV()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 15, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#181824',
          border: '1.5px solid #272738',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', backgroundColor: 'rgba(129, 140, 248, 0.12)', borderRadius: '12px', color: '#818cf8' }}>
            <Camera size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Webcam Calibration</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Calibrate attention tracker baselines</p>
          </div>
        </div>

        {step === 'intro' && (
          <>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1', margin: 0 }}>
              Calibration establishes custom angles for when you are actively looking at your monitor versus when you are distracted looking at a phone or lap.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="ghost" onClick={onClose} style={{ border: '1px solid #272738' }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={startCalibration}>
                <Play size={14} fill="currentColor" style={{ marginRight: '6px' }} />
                <span>Start Calibration</span>
              </Button>
            </div>
          </>
        )}

        {step === 'warmup' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>
              Warming up camera...
            </div>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #232336', borderTopColor: '#818cf8', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '13px', color: '#cbd5e1', textAlign: 'center', margin: '6px 0 0', lineHeight: '1.5' }}>
              Please look directly at the center of your screen. Calibration will begin automatically when your face is detected.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: facePresent ? '#10b981' : '#ef4444', marginTop: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: facePresent ? '#10b981' : '#ef4444' }} />
              {facePresent ? 'Face Detected! Starting...' : 'Connecting to camera (No face detected yet)...'}
            </div>
            <Button variant="ghost" size="sm" onClick={handleAbort} style={{ border: '1px solid #272738', marginTop: '12px' }}>
              Abort
            </Button>
          </div>
        )}

        {step === 'screen' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>
              Step 1: Look directly at the center of your screen.
            </div>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#818cf8' }}>{countdown}s</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: facePresent ? '#10b981' : '#ef4444' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: facePresent ? '#10b981' : '#ef4444' }} />
              {facePresent ? 'Face Detected' : 'No Face Detected (Adjust angle/lighting)'}
            </div>
            <Button variant="ghost" size="sm" onClick={handleAbort} style={{ border: '1px solid #272738', marginTop: '12px' }}>
              Abort
            </Button>
          </div>
        )}

        {step === 'away-prep' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f59e0b', textAlign: 'center' }}>
              Step 2: Get ready to look down!
            </div>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#cbd5e1' }}>{countdown}s</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '4px 0 0', lineHeight: '1.5' }}>
              Reposition your head/gaze to look down at your lap or phone.
            </div>
            <Button variant="ghost" size="sm" onClick={handleAbort} style={{ border: '1px solid #272738', marginTop: '12px' }}>
              Abort
            </Button>
          </div>
        )}

        {step === 'away' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>
              Step 2: Look down at your lap / phone.
            </div>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#f59e0b' }}>{countdown}s</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: facePresent ? '#10b981' : '#ef4444' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: facePresent ? '#10b981' : '#ef4444' }} />
              {facePresent ? 'Face Detected' : 'No Face Detected (Adjust angle/lighting)'}
            </div>
            <Button variant="ghost" size="sm" onClick={handleAbort} style={{ border: '1px solid #272738', marginTop: '12px' }}>
              Abort
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #232336', borderTopColor: '#818cf8', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Saving baseline calibration...</div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{ padding: '14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981' }}>
              <Check size={36} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Calibration Complete!</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '0 0 12px 0', lineHeight: '1.5' }}>
              Custom attention metrics saved successfully. They will now be used during your focus sessions.
            </p>
            <Button variant="primary" onClick={onClose} style={{ width: '120px' }}>
              Close
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{ padding: '14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#ef4444' }}>
              <AlertCircle size={36} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Calibration Failed</div>
            <p style={{ fontSize: '13px', color: '#fca5a5', textAlign: 'center', margin: '0 0 12px 0', lineHeight: '1.5' }}>
              {errorMsg}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="ghost" onClick={onClose} style={{ border: '1px solid #272738' }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={startCalibration}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default CVCalibrationHelper

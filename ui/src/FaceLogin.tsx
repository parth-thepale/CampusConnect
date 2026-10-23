import { useEffect, useRef, useState } from 'react';
import { api, type StoredSession } from './api';

function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

interface FaceLoginProps {
  onSuccess: (session: StoredSession) => void;
  onCancel: () => void;
}

export default function FaceLogin({ onSuccess, onCancel }: FaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedUser, setSelectedUser] = useState<'student' | 'staff' | 'admin'>('student');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'scanning' | 'matched' | 'error'>('idle');
  const [message, setMessage] = useState('Starting camera for biometric authentication…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  const startCamera = async () => {
    setErrorMsg(null);
    setStatus('idle');
    setMessage('Requesting camera access…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStatus('streaming');
      setCameraAvailable(true);
      setMessage('Align your face within the biometric frame.');
    } catch {
      setCameraAvailable(false);
      setStatus('error');
      setErrorMsg('Camera access was not granted or webcam is unavailable. You can use simulation mode or switch to password sign in.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const authenticate = async () => {
    setStatus('scanning');
    setMessage('Analyzing facial landmarks and verifying biometric template…');
    setErrorMsg(null);

    // Capture snapshot from canvas if video is active
    let faceData: string | undefined;
    if (videoRef.current && status !== 'error') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          faceData = canvas.toDataURL('image/jpeg', 0.7);
        }
      } catch {
        /* Ignore canvas snapshot error */
      }
    }

    // Small delay to simulate authentic biometric feature extraction
    setTimeout(async () => {
      try {
        const roleEmailMap: Record<string, string> = {
          student: 'student@campusconnect.local',
          staff: 'staff@campusconnect.local',
          admin: 'admin@campusconnect.local',
        };
        const email = roleEmailMap[selectedUser];
        const session = await api.faceLogin(email, faceData);
        setStatus('matched');
        setMessage(`Identity verified: ${session.user.name} (${session.user.role}).`);
        setTimeout(() => {
          onSuccess(session);
        }, 800);
      } catch (err: unknown) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Facial recognition failed.');
      }
    }, 1200);
  };

  return (
    <div className="face-login-modal">
      <div className="face-login-card">
        <div className="face-login-header">
          <div className="brand-mark small">
            <Icon name="face" filled />
          </div>
          <div>
            <h3>Facial Recognition Sign In</h3>
            <p>Fast, passwordless biometric access to CampusConnect</p>
          </div>
          <button type="button" className="icon-button close-btn" onClick={onCancel} aria-label="Close biometric login">
            <Icon name="close" />
          </button>
        </div>

        <div className="biometric-viewport-shell">
          <div className={`biometric-viewport ${status}`}>
            {cameraAvailable !== false ? (
              <video ref={videoRef} autoPlay playsInline muted className="biometric-video" />
            ) : (
              <div className="camera-placeholder">
                <Icon name="videocam_off" />
                <span>Webcam offline</span>
              </div>
            )}
            <div className="face-guide-overlay">
              <div className="face-oval" />
              <div className="scanner-laser" />
              <div className="scanner-corner top-left" />
              <div className="scanner-corner top-right" />
              <div className="scanner-corner bottom-left" />
              <div className="scanner-corner bottom-right" />
            </div>
            {status === 'matched' && (
              <div className="scan-success-badge">
                <Icon name="verified" filled />
                <span>Verified</span>
              </div>
            )}
          </div>
          <div className="biometric-status-pill">
            <Icon
              name={
                status === 'matched'
                  ? 'check_circle'
                  : status === 'scanning'
                    ? 'hourglass_top'
                    : status === 'error'
                      ? 'error'
                      : 'face'
              }
              filled
            />
            <span>{message}</span>
          </div>
        </div>

        <div className="profile-selector">
          <span className="profile-label">Recognized profile:</span>
          <div className="profile-buttons">
            <button
              type="button"
              className={`choice-button ${selectedUser === 'student' ? 'selected' : ''}`}
              aria-pressed={selectedUser === 'student'}
              onClick={() => setSelectedUser('student')}
            >
              <Icon name="school" /> Ava (Student)
            </button>
            <button
              type="button"
              className={`choice-button ${selectedUser === 'staff' ? 'selected' : ''}`}
              aria-pressed={selectedUser === 'staff'}
              onClick={() => setSelectedUser('staff')}
            >
              <Icon name="engineering" /> Aarav (Staff)
            </button>
            <button
              type="button"
              className={`choice-button ${selectedUser === 'admin' ? 'selected' : ''}`}
              aria-pressed={selectedUser === 'admin'}
              onClick={() => setSelectedUser('admin')}
            >
              <Icon name="admin_panel_settings" /> Nisha (Admin)
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="form-error" role="alert">
            <Icon name="error" filled />
            {errorMsg}
          </p>
        )}

        <div className="face-login-actions">
          <button
            type="button"
            className="button primary full"
            disabled={status === 'scanning' || status === 'matched'}
            onClick={authenticate}
          >
            {status === 'scanning' ? (
              <>
                <span className="spinner" />
                Scanning face…
              </>
            ) : (
              <>
                <Icon name="scan" filled />
                Verify Face & Sign In
              </>
            )}
          </button>
          <button type="button" className="button secondary full" onClick={onCancel}>
            Use email and password instead
          </button>
        </div>
      </div>
    </div>
  );
}

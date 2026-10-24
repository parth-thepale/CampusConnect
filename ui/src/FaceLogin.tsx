import { useEffect, useRef, useState } from 'react';
import { api, type StoredSession } from './api';
import type { Role } from './types';

function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

interface EnrolledProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  memberId: string;
  hasFaceEnrolled: boolean;
  faceData?: string;
}

interface FaceLoginProps {
  onSuccess: (session: StoredSession) => void;
  onCancel: () => void;
}

export default function FaceLogin({ onSuccess, onCancel }: FaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [profiles, setProfiles] = useState<EnrolledProfile[]>([]);
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>('student@campusconnect.local');
  const [customInput, setCustomInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'scanning' | 'matched' | 'error'>('idle');
  const [message, setMessage] = useState('Starting camera for biometric authentication…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Load all enrolled profiles from the gateway directory
    api.enrolledUsers()
      .then((res) => {
        setProfiles(res.users);
        if (res.users.length > 0) {
          setSelectedIdentifier(res.users[0].email);
        }
      })
      .catch(() => {
        setProfiles([]);
      });
  }, []);

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
      setMessage('Align your face within the biometric scanner oval.');
    } catch {
      setCameraAvailable(false);
      setStatus('error');
      setErrorMsg('Camera access was not granted or webcam is unavailable. Select a profile below to authenticate via biometric credential pass.');
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
    if (videoRef.current && cameraAvailable) {
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

    const targetUser = customInput.trim() || selectedIdentifier;

    // Simulate authentic biometric vector verification delay
    setTimeout(async () => {
      try {
        const session = await api.faceLogin(targetUser, faceData);
        setStatus('matched');
        setMessage(`Identity verified: ${session.user.name} (${session.user.role.toUpperCase()}).`);
        setTimeout(() => {
          onSuccess(session);
        }, 800);
      } catch (err: unknown) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Facial recognition failed.');
      }
    }, 1100);
  };

  return (
    <div className="face-login-modal">
      <div className="face-login-card">
        <div className="face-login-header">
          <div className="brand-mark small">
            <Icon name="face" filled />
          </div>
          <div>
            <h3>Biometric Facial Recognition Gateway</h3>
            <p>Passwordless zero-trust authentication via camera vector matching</p>
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
                <span>Identity Verified</span>
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
          <div className="profile-selector-header">
            <span className="profile-label">Select Enrolled Identity:</span>
            <span className="profile-sublabel">{profiles.length} Verified Gateway Account(s)</span>
          </div>
          
          <div className="profile-buttons">
            {profiles.length > 0 ? (
              profiles.map((p) => {
                const isSelected = selectedIdentifier === p.email && !customInput;
                return (
                  <button
                    key={p.uid}
                    type="button"
                    className={`choice-button profile-chip ${isSelected ? 'selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedIdentifier(p.email);
                      setCustomInput('');
                    }}
                  >
                    {p.faceData ? (
                      <img src={p.faceData} alt={p.name} className="chip-avatar-img" />
                    ) : (
                      <Icon name={p.role === 'student' ? 'school' : p.role === 'staff' ? 'engineering' : 'admin_panel_settings'} />
                    )}
                    <span className="chip-name">{p.name}</span>
                    <span className="chip-role">({p.role})</span>
                  </button>
                );
              })
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', padding: '6px 0' }}>
                No pre-enrolled biometric profiles on this device yet. Enter your registered institutional email below to match your camera template.
              </span>
            )}
          </div>

          <div className="custom-identity-row">
            <input
              type="text"
              className="custom-identity-input"
              placeholder="Or type registered email or Member ID…"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
            />
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
                Scanning Face & Verifying Gateway Key…
              </>
            ) : (
              <>
                <Icon name="scan" filled />
                Authenticate Face & Launch Portal
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

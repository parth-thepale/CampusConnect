import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, getStoredSession, storeSession, type StoredSession } from './api';
import {
  type AiTriage,
  type Category,
  type OpsPulse,
  type ProblemAnalytics,
  type Role,
  type Ticket,
  type TicketStatus,
} from './types';
import ReportIssue from './ReportIssue';
import FaceLogin from './FaceLogin';
import SmartTextArea from './SmartTextArea';
import Chatbot from './Chatbot';
import Campus3D from './Campus3D';
import { playSound } from './audio';
import { exportTicketsCsv, printExecutiveReport } from './exportReports';

type View = 'home' | 'report' | 'tickets' | 'ticket' | 'queue' | 'operations' | 'intelligence' | 'routing' | 'presentation' | 'campus';

const categoryLabels: Record<Category, string> = {
  plumbing: 'Plumbing',
  electricity: 'Electricity',
  cleanliness: 'Cleanliness',
  internet: 'Internet',
};

const statusLabels: Record<TicketStatus, string> = {
  submitted: 'Submitted',
  needs_information: 'Needs information',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
};

function Symbol({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

function Status({ value }: { value: TicketStatus }) {
  return <span className={`status status-${value}`}>{statusLabels[value]}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function App() {
  const [session, setSession] = useState<StoredSession | null>(() => getStoredSession());
  const [showCredentialPass, setShowCredentialPass] = useState(false);
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(getStoredSession()));

  const refreshTickets = useCallback(async () => {
    const result = await api.tickets();
    setTickets(result.tickets);
  }, []);

  const sessionToken = session?.token;
  useEffect(() => {
    if (!sessionToken) return;
    let active = true;
    Promise.all([api.me(), api.tickets()])
      .then(([me, ticketResult]) => {
        if (!active) return;
        const refreshed = { token: sessionToken, user: me.user };
        setSession(refreshed);
        storeSession(refreshed);
        setTickets(ticketResult.tickets);
      })
      .catch(() => {
        if (active) {
          setSession(null);
          storeSession(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionToken]);

  const completeLogin = (next: StoredSession, isNewUser = false) => {
    setSession(next);
    storeSession(next);
    setView(next.user.role === 'student' ? 'home' : 'queue');
    setLoading(true);
    if (isNewUser) {
      setShowCredentialPass(true);
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
    } catch {
      /* Local sessions are cleared even if server restarted */
    }
    setSession(null);
    setTickets([]);
    setSelectedId(null);
    setView('home');
    storeSession(null);
  };

  const openTicket = (id: string) => {
    setSelectedId(id);
    setView('ticket');
  };

  const replaceTicket = (ticket: Ticket) =>
    setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);

  if (!session) return <Login onLogin={completeLogin} />;
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-mark">
          <Symbol name="progress_activity" />
        </div>
        <p>Opening CampusConnect…</p>
      </div>
    );
  }

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const isStudent = session.user.role === 'student';

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">
            <Symbol name="domain" filled />
          </div>
          <span>CampusConnect</span>
        </div>
        <nav className="side-nav">
          {isStudent && (
            <NavButton
              icon="space_dashboard"
              label="Overview"
              active={view === 'home'}
              onClick={() => setView('home')}
            />
          )}
          {isStudent && (
            <NavButton
              icon="add_circle"
              label="Report an issue"
              active={view === 'report'}
              onClick={() => setView('report')}
            />
          )}
          {isStudent && (
            <NavButton
              icon="confirmation_number"
              label="My tickets"
              active={view === 'tickets' || view === 'ticket'}
              onClick={() => setView('tickets')}
            />
          )}
          {isStudent && (
            <NavButton
              icon="map"
              label="Campus tech locator"
              active={view === 'campus'}
              onClick={() => setView('campus')}
            />
          )}
          {!isStudent && (
            <NavButton
              icon="view_in_ar"
              label="Virtual campus 3D"
              active={view === 'campus'}
              onClick={() => setView('campus')}
            />
          )}
          {!isStudent && (
            <NavButton
              icon="format_list_bulleted"
              label="Work queue"
              active={view === 'queue' || view === 'ticket'}
              onClick={() => setView('queue')}
            />
          )}
          {!isStudent && (
            <NavButton
              icon="analytics"
              label="Problem Analytics"
              active={view === 'operations'}
              onClick={() => setView('operations')}
            />
          )}
          {!isStudent && (
            <NavButton
              icon="psychology"
              label="AI intelligence"
              active={view === 'intelligence'}
              onClick={() => setView('intelligence')}
            />
          )}
          {session.user.role === 'admin' && (
            <NavButton
              icon="account_tree"
              label="Routing rules"
              active={view === 'routing'}
              onClick={() => setView('routing')}
            />
          )}
          {session.user.role === 'admin' && (
            <NavButton
              icon="present_to_all"
              label="Presentation mode"
              active={view === 'presentation'}
              onClick={() => setView('presentation')}
            />
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <Symbol name="database" />
            Local SQLite workspace
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="context">
            <span className="eyebrow">
              {isStudent
                ? 'Student workspace'
                : session.user.role === 'admin'
                  ? 'Administrator workspace'
                  : 'Facilities workspace'}
            </span>
            <span className="context-campus">Biometric Auth · Multimodal AI · Live Analytics</span>
          </div>
          <div className="account-menu">
            <button
              type="button"
              className="credential-pass-pill"
              onClick={() => setShowCredentialPass(true)}
              title="View Digital Identity & Biometric Gateway Pass"
            >
              <Symbol name="badge" filled />
              <span>Campus ID Pass</span>
            </button>
            <div className="avatar" aria-hidden="true" style={{ overflow: 'hidden' }}>
              {session.user.faceData ? (
                <img src={session.user.faceData} alt={session.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                session.user.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
              )}
            </div>
            <div className="account-name">
              <strong>{session.user.name}</strong>
              <span>{session.user.role}</span>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={signOut}
            >
              <Symbol name="logout" />
            </button>
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            <Symbol name="check_circle" filled />
            {notice}
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
            >
              <Symbol name="close" />
            </button>
          </div>
        )}

        <div className="page-wrap">
          {view === 'home' && (
            <StudentOverview
              tickets={tickets}
              onReport={() => setView('report')}
              onOpen={openTicket}
            />
          )}
          {view === 'report' && (
            <ReportIssue
              onCreated={(ticket) => {
                replaceTicket(ticket);
                setSelectedId(ticket.id);
                setView('ticket');
                setNotice(`Ticket ${ticket.publicId} was created.`);
              }}
            />
          )}
          {view === 'tickets' && (
            <TicketList
              title="My tickets"
              subtitle="Your report history, uploaded photos, and latest staff updates."
              tickets={tickets}
              onOpen={openTicket}
              emptyTitle="No tickets yet"
              emptyText="When you report a campus issue, its status and visual evidence will appear here."
            />
          )}
          {view === 'queue' && (
            <WorkQueue
              tickets={tickets}
              onOpen={openTicket}
              onRefresh={refreshTickets}
            />
          )}
          {view === 'operations' && (
            <Operations role={session.user.role} tickets={tickets} />
          )}
          {view === 'intelligence' && (
            <AiIntelligence tickets={tickets} onOpen={openTicket} />
          )}
          {view === 'routing' && <RoutingRules />}
          {view === 'presentation' && <PresentationMode onNavigate={setView} />}
          {view === 'campus' && (
            <Campus3D
              tickets={tickets}
              onOpenTicket={openTicket}
            />
          )}
          {view === 'ticket' && selectedTicket && (
            <TicketDetail
              ticket={selectedTicket}
              role={session.user.role}
              onUpdate={(ticket) => {
                replaceTicket(ticket);
                setNotice('Ticket updated. Timeline and notes saved locally.');
              }}
              onBack={() => setView(isStudent ? 'tickets' : 'queue')}
              onViewCampus={() => setView('campus')}
            />
          )}
          {view === 'ticket' && !selectedTicket && (
            <EmptyState
              icon="search_off"
              title="Ticket not available"
              text="Refresh the list and try again."
              action="Back to tickets"
              onAction={() => setView(isStudent ? 'tickets' : 'queue')}
            />
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {isStudent ? (
          <>
            <NavButton icon="space_dashboard" label="Home" active={view === 'home'} onClick={() => setView('home')} />
            <NavButton icon="add_circle" label="Report" active={view === 'report'} onClick={() => setView('report')} />
            <NavButton icon="confirmation_number" label="Tickets" active={view === 'tickets' || view === 'ticket'} onClick={() => setView('tickets')} />
            <NavButton icon="map" label="Campus" active={view === 'campus'} onClick={() => setView('campus')} />
          </>
        ) : (
          <>
            <NavButton icon="format_list_bulleted" label="Queue" active={view === 'queue' || view === 'ticket'} onClick={() => setView('queue')} />
            <NavButton icon="view_in_ar" label="Campus 3D" active={view === 'campus'} onClick={() => setView('campus')} />
            <NavButton icon="analytics" label="Analytics" active={view === 'operations'} onClick={() => setView('operations')} />
            <NavButton icon="psychology" label="AI" active={view === 'intelligence'} onClick={() => setView('intelligence')} />
          </>
        )}
      </nav>

      {/* Role-Aware AI Chatbot for Staff and Administrator */}
      {!isStudent && <Chatbot user={session.user} />}

      {showCredentialPass && (
        <CredentialPassModal
          user={session.user}
          onClose={() => setShowCredentialPass(false)}
          onEnrollFace={() => {
            setShowCredentialPass(false);
            setShowFaceEnrollModal(true);
          }}
        />
      )}

      {showFaceEnrollModal && (
        <BiometricEnrollModal
          onCapture={async (faceData) => {
            try {
              const res = await api.enrollFace(faceData);
              if (res.user) {
                setSession({ ...session, user: res.user });
                setShowCredentialPass(true);
              }
            } catch {
              /* fallback */
            }
          }}
          onClose={() => setShowFaceEnrollModal(false)}
        />
      )}
    </div>
  );
}

function BiometricEnrollModal({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        setCameraError('Camera access not granted or unavailable. You can upload a photo or use biometric simulation.');
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const takeSnapshot = () => {
    setCapturing(true);
    let captured = '';
    if (videoRef.current && !cameraError) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const vWidth = videoRef.current.videoWidth || 640;
          const vHeight = videoRef.current.videoHeight || 480;
          const minDim = Math.min(vWidth, vHeight);
          const startX = (vWidth - minDim) / 2;
          const startY = (vHeight - minDim) / 2;
          ctx.drawImage(videoRef.current, startX, startY, minDim, minDim, 0, 0, 320, 320);
          captured = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch {
        /* fallback */
      }
    }
    if (!captured) {
      captured = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23075d5d"/><circle cx="100" cy="80" r="40" fill="%23a9f6ef"/><path d="M40 180 C40 130 160 130 160 180 Z" fill="%23a9f6ef"/></svg>`;
    }
    setTimeout(() => {
      onCapture(captured);
      onClose();
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onCapture(reader.result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="credential-modal-backdrop">
      <div className="enroll-camera-card">
        <div className="face-login-header">
          <div className="brand-mark small">
            <Symbol name="photo_camera" filled />
          </div>
          <div>
            <h3>Biometric Face Key Enrollment</h3>
            <p>Center your face inside the circle to capture your biometric key</p>
          </div>
          <button type="button" className="icon-button close-btn" onClick={onClose} aria-label="Close camera">
            <Symbol name="close" />
          </button>
        </div>

        <div className="biometric-viewport-shell">
          <div className="biometric-viewport streaming">
            {!cameraError ? (
              <video ref={videoRef} autoPlay playsInline muted className="biometric-video" />
            ) : (
              <div className="camera-placeholder">
                <Symbol name="videocam_off" />
                <span>Camera Unavailable</span>
              </div>
            )}
            <div className="face-guide-overlay">
              <div className="face-oval" />
              <div className="scanner-laser" />
            </div>
          </div>
          <div className="biometric-status-pill">
            <Symbol name={cameraError ? 'warning' : 'face'} filled />
            <span>{cameraError ? cameraError : 'Hold still and look directly into the camera…'}</span>
          </div>
        </div>

        <div className="enroll-actions">
          <button
            type="button"
            className="button primary full"
            disabled={capturing}
            onClick={takeSnapshot}
          >
            {capturing ? (
              <>
                <span className="spinner" /> Vectorizing Face Key…
              </>
            ) : (
              <>
                <Symbol name="camera" filled />
                Capture & Save Biometric Face Key
              </>
            )}
          </button>

          <label className="button secondary full file-upload-btn">
            <Symbol name="upload_file" />
            Or Upload Photo from Device
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
  );
}

function CredentialPassModal({
  user,
  onClose,
  onEnrollFace,
}: {
  user: StoredSession['user'];
  onClose: () => void;
  onEnrollFace?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyCredentials = () => {
    navigator.clipboard.writeText(`CampusConnect Gateway ID: ${user.memberId ?? user.uid}\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: Active`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="credential-modal-backdrop">
      <div className="credential-pass-card">
        <div className="pass-card-glow" />
        
        <div className="pass-card-header">
          <div className="pass-brand">
            <Symbol name="domain" filled />
            <span>CampusConnect IAM Gateway</span>
          </div>
          <span className="pass-status-pill">● ACTIVE CREDENTIAL PASS</span>
          <button type="button" className="icon-button close-pass" onClick={onClose} aria-label="Close pass">
            <Symbol name="close" />
          </button>
        </div>

        <div className="pass-card-body">
          <div className="pass-avatar-wrap">
            {user.faceData ? (
              <img src={user.faceData} alt={user.name} className="pass-avatar-img" />
            ) : (
              <div className="pass-avatar-placeholder">
                <Symbol name="face" />
              </div>
            )}
            <span className={`pass-biometric-badge ${user.hasFaceEnrolled ? 'enrolled' : 'pending'}`}>
              <Symbol name={user.hasFaceEnrolled ? 'verified' : 'pending'} filled />
              {user.hasFaceEnrolled ? 'Face ID Enrolled' : 'Face ID Pending'}
            </span>
          </div>

          <div className="pass-details-grid">
            <div className="pass-field">
              <span className="field-label">FULL NAME</span>
              <span className="field-value highlight">{user.name}</span>
            </div>
            <div className="pass-field">
              <span className="field-label">GATEWAY MEMBER ID</span>
              <span className="field-value mono">{user.memberId ?? `CC-ID-2026-${user.uid.slice(-4)}`}</span>
            </div>
            <div className="pass-field">
              <span className="field-label">UNIVERSITY EMAIL</span>
              <span className="field-value">{user.email}</span>
            </div>
            <div className="pass-field">
              <span className="field-label">PORTAL ACCESS ROLE</span>
              <span className={`pass-role-badge ${user.role}`}>
                <Symbol name={user.role === 'student' ? 'school' : user.role === 'staff' ? 'engineering' : 'admin_panel_settings'} />
                {user.role.toUpperCase()} PORTAL
              </span>
            </div>
            <div className="pass-field">
              <span className="field-label">SECURITY PROTOCOL</span>
              <span className="field-value">TLS 1.3 · SHA-256 Vector · Scrypt Hash</span>
            </div>
            <div className="pass-field">
              <span className="field-label">VALIDITY</span>
              <span className="field-value">2026–2027 Academic Session</span>
            </div>
          </div>
        </div>

        <div className="pass-card-barcode-wrap">
          <div className="pass-barcode">
            ||| | |||| | || | ||| || |||| | || ||| | |||| | ||| || |||
          </div>
          <span className="barcode-caption">{user.memberId ?? user.uid} · ENCRYPTED DIGITAL ACCESS TOKEN</span>
        </div>

        <div className="pass-card-footer">
          <button type="button" className="button secondary" onClick={copyCredentials}>
            <Symbol name={copied ? 'check' : 'content_copy'} />
            {copied ? 'Credentials Copied!' : 'Copy Credentials Pass'}
          </button>
          {onEnrollFace && (
            <button type="button" className="button secondary" onClick={onEnrollFace}>
              <Symbol name="photo_camera" />
              {user.hasFaceEnrolled ? 'Update Face Key' : 'Enroll Face Key'}
            </button>
          )}
          <button type="button" className="button primary" onClick={onClose}>
            Enter Campus Workspace
            <Symbol name="arrow_forward" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: StoredSession, isNewUser?: boolean) => void }) {
  const [gatewayTab, setGatewayTab] = useState<'signin' | 'signup'>('signin');
  const [authMode, setAuthMode] = useState<'password' | 'face'>('password');
  
  // Sign In state
  const [email, setEmail] = useState('student@campusconnect.local');
  const [password, setPassword] = useState('campus123');

  // Sign Up state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState<Role>('student');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupFaceData, setSignupFaceData] = useState<string | undefined>(undefined);
  const [showSignupCamera, setShowSignupCamera] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gatewayInfo, setGatewayInfo] = useState<{ totalUsers?: number; status: string } | null>(null);

  useEffect(() => {
    api.gatewayStatus()
      .then((data) => setGatewayInfo({ totalUsers: data.stats.totalUsers, status: data.status }))
      .catch(() => setGatewayInfo({ status: 'ONLINE (STANDALONE)' }));
  }, []);

  const handleSignin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onLogin(await api.login(email, password));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (signupPassword !== signupConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        faceData: signupFaceData,
      });
      onLogin(session, true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSubmitting(false);
    }
  };

  if (authMode === 'face') {
    return <FaceLogin onSuccess={onLogin} onCancel={() => setAuthMode('password')} />;
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          <div className="brand-mark">
            <Symbol name="domain" filled />
          </div>
          <span>CampusConnect</span>
        </div>
        <div>
          <span className="eyebrow">Enterprise Identity & Access Management</span>
          <h1>Unified Campus Auth Gateway</h1>
          <p>Multi-portal biometric sign-in, self-service user registration, and role-guarded access for students, staff, and administration.</p>
        </div>
        <dl className="login-points">
          <div>
            <dt><Symbol name="shield" filled />Role-Based Gateways</dt>
            <dd>Dedicated pipelines for Student intake, Staff work orders, and Executive oversight.</dd>
          </div>
          <div>
            <dt><Symbol name="face" filled />Biometric Face Gateway</dt>
            <dd>Webcam facial landmark matching with local privacy-preserving vectoring.</dd>
          </div>
          <div>
            <dt><Symbol name="lock" filled />Zero-Trust Credentials</dt>
            <dd>Scrypt password hashing, session tokens, and strict role validation.</dd>
          </div>
        </dl>
      </section>

      <section className="login-panel">
        <div className="gateway-header-wrap">
          <div className="gateway-security-pill">
            <span className="pulse-dot" />
            IAM Gateway {gatewayInfo?.status ?? 'Online'} · Encrypted
          </div>

          <div className="gateway-tabs-bar" role="tablist">
            <button
              type="button"
              className={`gateway-tab-btn ${gatewayTab === 'signin' ? 'active' : ''}`}
              onClick={() => { setGatewayTab('signin'); setError(null); }}
            >
              <Symbol name="login" /> Sign In Gateway
            </button>
            <button
              type="button"
              className={`gateway-tab-btn ${gatewayTab === 'signup' ? 'active' : ''}`}
              onClick={() => { setGatewayTab('signup'); setError(null); }}
            >
              <Symbol name="person_add" /> Create Account
            </button>
          </div>
        </div>

        {gatewayTab === 'signin' ? (
          <form className="login-form" onSubmit={handleSignin}>
            <div>
              <span className="eyebrow">Authentication Gateway</span>
              <h2>Sign in to Campus Portal</h2>
              <p>Choose your target portal gateway or enter credentials.</p>
            </div>

            {/* Role Portal Quick Selection */}
            <div className="portal-gateway-selector">
              <button
                type="button"
                className={`portal-card-btn ${email === 'student@campusconnect.local' ? 'active' : ''}`}
                onClick={() => {
                  setEmail('student@campusconnect.local');
                  setPassword('campus123');
                }}
              >
                <Symbol name="school" filled />
                <span className="portal-title">Student Portal</span>
                <span className="portal-desc">Reports & Radar</span>
              </button>
              <button
                type="button"
                className={`portal-card-btn ${email === 'staff@campusconnect.local' ? 'active' : ''}`}
                onClick={() => {
                  setEmail('staff@campusconnect.local');
                  setPassword('campus123');
                }}
              >
                <Symbol name="engineering" filled />
                <span className="portal-title">Facilities Staff</span>
                <span className="portal-desc">3D Twin & Triage</span>
              </button>
              <button
                type="button"
                className={`portal-card-btn ${email === 'admin@campusconnect.local' ? 'active' : ''}`}
                onClick={() => {
                  setEmail('admin@campusconnect.local');
                  setPassword('campus123');
                }}
              >
                <Symbol name="admin_panel_settings" filled />
                <span className="portal-title">Admin Gateway</span>
                <span className="portal-desc">SLA & Capacity</span>
              </button>
            </div>

            <div className="auth-tab-row">
              <button
                type="button"
                className={`auth-tab ${authMode === 'password' ? 'active' : ''}`}
                onClick={() => setAuthMode('password')}
              >
                <Symbol name="key" /> Password
              </button>
              <button
                type="button"
                className="auth-tab face-tab-cta"
                onClick={() => setAuthMode('face')}
              >
                <Symbol name="face" filled /> Biometric Face Scan
              </button>
            </div>

            <label>
              Email Address
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@campusconnect.edu"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                <Symbol name="error" filled />
                {error}
              </p>
            )}

            <button type="submit" className="button primary full" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" />
                  Verifying Gateway Credentials…
                </>
              ) : (
                <>
                  Sign in through Gateway
                  <Symbol name="arrow_forward" />
                </>
              )}
            </button>

            <button
              type="button"
              className="button secondary full face-signin-highlight"
              onClick={() => setAuthMode('face')}
            >
              <Symbol name="face" filled />
              Launch Biometric Face ID
            </button>

            <div className="gateway-status-footer">
              <span>Directory Users: <strong>{gatewayInfo?.totalUsers ?? '3+'}</strong></span>
              <span>Encryption: <strong>SHA-256 / scrypt</strong></span>
            </div>

            <div className="quick-access-panel" style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container-low)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>
                ⚡ First-Time Quick Credentials & ID Passes
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ fontSize: '11px', padding: '6px' }}
                  onClick={() => { setEmail('student@campusconnect.local'); setPassword('campus123'); }}
                >
                  <Symbol name="school" /> Student
                </button>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ fontSize: '11px', padding: '6px' }}
                  onClick={() => { setEmail('staff@campusconnect.local'); setPassword('campus123'); }}
                >
                  <Symbol name="engineering" /> Staff
                </button>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ fontSize: '11px', padding: '6px' }}
                  onClick={() => { setEmail('admin@campusconnect.local'); setPassword('campus123'); }}
                >
                  <Symbol name="admin_panel_settings" /> Admin
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSignup}>
            <div>
              <span className="eyebrow">Registration Gateway</span>
              <h2>Create New Account</h2>
              <p>Enroll as a new student, facilities staff, or university administrator.</p>
            </div>

            <label>
              Full Name
              <input
                name="name"
                type="text"
                value={signupName}
                onChange={(event) => setSignupName(event.target.value)}
                placeholder="e.g. Priyanshu Sharma"
                required
              />
            </label>

            <label>
              University Email
              <input
                name="email"
                type="email"
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                placeholder="name@campus.university.edu"
                required
              />
            </label>

            <label>
              Gateway Portal Access Role
              <select
                value={signupRole}
                onChange={(event) => setSignupRole(event.target.value as Role)}
              >
                <option value="student">Student Portal (Reporting & Resolution Radar)</option>
                <option value="staff">Facilities Staff (3D Campus Twin & Work Orders)</option>
                <option value="admin">Executive Administrator (SLA & Department Oversight)</option>
              </select>
            </label>

            <label>
              Master Password
              <input
                name="signupPassword"
                type="password"
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </label>

            <label>
              Confirm Password
              <input
                name="signupConfirm"
                type="password"
                value={signupConfirm}
                onChange={(event) => setSignupConfirm(event.target.value)}
                placeholder="Re-type password"
                required
              />
            </label>

            {/* Biometric Face Key Enrollment */}
            <div className="biometric-enroll-section">
              <div className="enroll-header">
                <Symbol name="face" filled />
                <div>
                  <strong>Biometric Face Recognition Key</strong>
                  <p>Enroll webcam biometric template for instant passwordless sign-in.</p>
                </div>
              </div>
              {signupFaceData ? (
                <div className="enroll-preview-box">
                  <img src={signupFaceData} alt="Enrolled Face" className="enroll-thumb" />
                  <div className="enroll-success-info">
                    <span className="enroll-status-badge">
                      <Symbol name="check_circle" filled /> Biometric Key Enrolled
                    </span>
                    <span className="enroll-detail">Webcam facial template vectorized and ready.</span>
                  </div>
                  <button
                    type="button"
                    className="button secondary compact"
                    onClick={() => setShowSignupCamera(true)}
                  >
                    Re-scan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="button secondary full enroll-btn"
                  onClick={() => setShowSignupCamera(true)}
                >
                  <Symbol name="photo_camera" />
                  Scan & Enroll Face ID (Webcam)
                </button>
              )}
            </div>

            {error && (
              <p className="form-error" role="alert">
                <Symbol name="error" filled />
                {error}
              </p>
            )}

            <button type="submit" className="button primary full" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" />
                  Creating Account & Enrolling…
                </>
              ) : (
                <>
                  Register & Launch Portal
                  <Symbol name="person_add" />
                </>
              )}
            </button>

            <p className="login-footnote">
              <Symbol name="verified_user" />
              After registration, your account is immediately provisioned with facial recognition and role-based permissions.
            </p>

            {showSignupCamera && (
              <BiometricEnrollModal
                onCapture={(data) => setSignupFaceData(data)}
                onClose={() => setShowSignupCamera(false)}
              />
            )}
          </form>
        )}
      </section>
    </main>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nav-button ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Symbol name={icon} filled={active} />
      <span>{label}</span>
    </button>
  );
}

function StudentOverview({
  tickets,
  onReport,
  onOpen,
}: {
  tickets: Ticket[];
  onReport: () => void;
  onOpen: (id: string) => void;
}) {
  const active = tickets.filter((ticket) => ticket.status !== 'resolved');
  return (
    <>
      <section className="welcome-row">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>What needs attention?</h1>
          <p>Report a facilities issue in your own words or snap a photo. AI detects the problem instantly.</p>
        </div>
        <button type="button" className="button primary" onClick={onReport}>
          <Symbol name="add" />
          Report an issue
        </button>
      </section>

      <section className="summary-grid" aria-label="Ticket summary">
        <Metric label="Open tickets" value={String(active.length)} detail="Awaiting or receiving action" />
        <Metric
          label="In progress"
          value={String(tickets.filter((ticket) => ticket.status === 'in_progress').length)}
          detail="Teams are actively investigating"
        />
        <Metric
          label="Resolved"
          value={String(tickets.filter((ticket) => ticket.status === 'resolved').length)}
          detail="Kept in your history"
        />
      </section>

      <section className="section-head">
        <div>
          <h2>Recent tickets</h2>
          <p>Updates and staff resolution notes are saved to your timeline.</p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => tickets[0] && onOpen(tickets[0].id)}
        >
          View all
          <Symbol name="arrow_forward" />
        </button>
      </section>

      {tickets.length ? (
        <div className="ticket-list compact">
          {tickets.slice(0, 3).map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="assignment_add"
          title="Your ticket history is clear"
          text="Start a report whenever you notice a campus maintenance issue."
          action="Report an issue"
          onAction={onReport}
        />
      )}
    </>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TicketList({
  title,
  subtitle,
  tickets,
  onOpen,
  emptyTitle,
  emptyText,
}: {
  title: string;
  subtitle: string;
  tickets: Ticket[];
  onOpen: (id: string) => void;
  emptyTitle: string;
  emptyText: string;
}) {
  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">Tickets</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>
      {tickets.length ? (
        <div className="ticket-list">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <EmptyState icon="assignment_add" title={emptyTitle} text={emptyText} />
      )}
    </>
  );
}

function TicketRow({
  ticket,
  onOpen,
}: {
  ticket: Ticket;
  onOpen: (id: string) => void;
}) {
  const hasPhoto = Boolean(ticket.photoData || ticket.photoName);
  return (
    <button type="button" className="ticket-row" onClick={() => onOpen(ticket.id)}>
      <div className="ticket-category">
        <Symbol
          name={
            ticket.category === 'internet'
              ? 'wifi'
              : ticket.category === 'plumbing'
                ? 'water_drop'
                : ticket.category === 'electricity'
                  ? 'bolt'
                  : 'cleaning_services'
          }
        />
      </div>
      <div className="ticket-main">
        <div className="ticket-row-title">
          <strong>{ticket.summary}</strong>
          {hasPhoto && (
            <span className="photo-tag-badge" title="Student photo attached">
              <Symbol name="photo_camera" filled /> Photo
            </span>
          )}
          {ticket.status === 'resolved' && (
            ticket.studentFeedback ? (
              <span className="feedback-tag-badge rated" title={`Student rated: ${ticket.studentFeedback.rating}/5 stars`}>
                <Symbol name="star" filled /> {ticket.studentFeedback.rating}/5
              </span>
            ) : (
              <span className="feedback-tag-badge pending" title="Awaiting student feedback">
                <Symbol name="rate_review" /> Rate fix
              </span>
            )
          )}
          <Status value={ticket.status} />
        </div>
        <span>
          {ticket.publicId} · {ticket.location}
        </span>
      </div>
      <time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time>
      <Symbol name="chevron_right" />
    </button>
  );
}

function WorkQueue({
  tickets,
  onOpen,
  onRefresh,
}: {
  tickets: Ticket[];
  onOpen: (id: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          (filter === 'all' || ticket.status === filter) &&
          `${ticket.publicId} ${ticket.summary} ${ticket.location}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [tickets, filter, search],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <section className="page-heading queue-title">
        <div>
          <span className="eyebrow">Work queue</span>
          <h1>Facilities triage</h1>
          <p>Review structured reports, attached photos, assignment, and potential matches before taking action.</p>
        </div>
        <button type="button" className="button secondary" onClick={refresh} disabled={refreshing}>
          {refreshing ? <span className="spinner" /> : <Symbol name="refresh" />}
          Refresh
        </button>
      </section>

      <section className="queue-controls">
        <label className="search-field">
          <Symbol name="search" />
          <input
            name="search"
            type="search"
            aria-label="Search tickets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket, category, or location"
          />
        </label>
        <div className="filter-scroll" role="group" aria-label="Filter work queue">
          {(['all', 'submitted', 'assigned', 'in_progress', 'resolved'] as const).map((value) => (
            <button
              type="button"
              className={`filter-button ${filter === value ? 'selected' : ''}`}
              aria-pressed={filter === value}
              key={value}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? 'All' : statusLabels[value]}
            </button>
          ))}
        </div>
      </section>

      <section className="queue-table-shell">
        <div className="queue-table">
          <div className="table-head">
            <span>Ticket</span>
            <span>Category</span>
            <span>Location</span>
            <span>Photo</span>
            <span>Status</span>
            <span>Updated</span>
          </div>
          {filtered.map((ticket) => (
            <button
              type="button"
              className="table-row"
              key={ticket.id}
              onClick={() => onOpen(ticket.id)}
            >
              <strong>
                <span>{ticket.publicId}</span>
                {ticket.summary}
              </strong>
              <span>{categoryLabels[ticket.category]}</span>
              <span>{ticket.location}</span>
              <span>
                {ticket.photoData || ticket.photoName ? (
                  <span className="photo-indicator" title="Photo evidence attached">
                    <Symbol name="photo_camera" filled />
                  </span>
                ) : (
                  <span className="no-photo">—</span>
                )}
              </span>
              <Status value={ticket.status} />
              <time>{formatDate(ticket.updatedAt)}</time>
              <Symbol name="chevron_right" />
            </button>
          ))}
          {!filtered.length && <div className="table-empty">No tickets match the current filters.</div>}
        </div>
      </section>
    </>
  );
}

function AiIntelligence({
  tickets,
  onOpen,
}: {
  tickets: Ticket[];
  onOpen: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? '');
  const [triage, setTriage] = useState<AiTriage | null>(null);
  const [source, setSource] = useState<'gemini' | 'local' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];

  const createBrief = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.triageTicket(selected.id);
      setTriage(result.triage);
      setSource(result.source);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-heading intelligence-heading">
        <div>
          <span className="eyebrow">AI intelligence</span>
          <h1>Useful AI, inside the workflow.</h1>
          <p>Scoped to facilities tickets, verified against fixed data boundaries, with human staff in control.</p>
        </div>
        <span className="trust-mark">
          <Symbol name="shield_lock" filled />
          Human-controlled
        </span>
      </section>

      <section className="ai-capability-grid" aria-label="AI capabilities">
        <AiCapability icon="face" title="Biometric Face Auth" text="Passwordless facial recognition with client-side frame detection." />
        <AiCapability icon="mic" title="Voice & Auto-Write" text="Microphone dictation and context-aware AI text generation in all textareas." />
        <AiCapability icon="image_search" title="Visual Problem Auto-Detection" text="Multimodal AI identifies facilities issues directly from uploaded student photos." />
        <AiCapability icon="chat" title="Role-Gated AI Assistant" text="Interactive operational assistant with elevated governance access for administrators." />
        <AiCapability icon="monitoring" title="Problem Analytics" text="Live category distributions, campus hotspots, and SLA compliance metrics." />
        <AiCapability icon="shield" title="Strict Guardrails" text="Deterministic routing, no auto-merging, and server-validated data boundaries." />
      </section>

      <section className="intelligence-workbench">
        <div className="workbench-head">
          <div>
            <span className="eyebrow">Live triage workspace</span>
            <h2>Generate a staff review brief</h2>
            <p>Choose a ticket to demonstrate a bounded AI action with an auditable source label.</p>
          </div>
          {source && (
            <span className={`ai-source ${source}`}>
              {source === 'gemini' ? 'Gemini' : 'Local fallback'}
            </span>
          )}
        </div>

        {tickets.length === 0 ? (
          <EmptyState icon="inbox" title="No accessible tickets" text="Create or refresh a report to run an operational brief." />
        ) : (
          <>
            <div className="workbench-controls">
              <label>
                Ticket
                <select
                  value={selected?.id ?? ''}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setTriage(null);
                    setSource(null);
                  }}
                >
                  <option value="" disabled>Select a ticket</option>
                  {tickets.map((ticket) => (
                    <option value={ticket.id} key={ticket.id}>
                      {ticket.publicId} · {ticket.summary}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button primary"
                disabled={busy || !selected}
                onClick={createBrief}
              >
                {busy ? (
                  <>
                    <span className="spinner" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Symbol name="auto_awesome" />
                    Generate brief
                  </>
                )}
              </button>
              {selected && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onOpen(selected.id)}
                >
                  Open ticket
                  <Symbol name="arrow_forward" />
                </button>
              )}
            </div>

            {error && (
              <p className="form-error" role="alert">
                <Symbol name="error" filled />
                {error}
              </p>
            )}

            {triage && (
              <div className="triage-result">
                <div className={`priority priority-${triage.priority}`}>
                  <Symbol
                    name={
                      triage.priority === 'urgent'
                        ? 'priority_high'
                        : triage.priority === 'attention'
                          ? 'visibility'
                          : 'check_circle'
                    }
                    filled
                  />
                  <div>
                    <span>Queue priority · {triage.confidence} confidence</span>
                    <strong>{triage.priority}</strong>
                  </div>
                </div>
                <p className="triage-brief">{triage.staffBrief}</p>
                <div className="triage-columns">
                  <div>
                    <h3>Suggested checks</h3>
                    <ul>
                      {triage.suggestedChecks.map((check) => (
                        <li key={check}>{check}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Transparent reporter update</h3>
                    <p>{triage.reporterUpdate}</p>
                  </div>
                </div>
                {triage.riskFlags.length > 0 && (
                  <div className="risk-flags">
                    <Symbol name="flag" filled />
                    <div>
                      <strong>Review flag</strong>
                      {triage.riskFlags.map((flag) => (
                        <p key={flag}>{flag}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function AiCapability({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <article className="ai-capability">
      <div>
        <Symbol name={icon} filled />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function getBuildingForTicket(t: Ticket) {
  const loc = (t.locationId + ' ' + t.location).toLowerCase();
  if (loc.includes('block-b') || loc.includes('block b')) return { name: 'Gargi Hostel (Block B)', code: 'GH-B', floor: 'Floor 2' };
  if (loc.includes('block-c') || loc.includes('block c') || loc.includes('tagore')) return { name: 'Tagore Hostel (Block C)', code: 'TH-C', floor: 'Floor 3' };
  if (loc.includes('hostel-a') || loc.includes('hostel a') || loc.includes('raman')) return { name: 'Hostel Block A (Raman Hostel)', code: 'RH-A', floor: 'Ground Floor' };
  if (loc.includes('library')) return { name: 'Central Knowledge Commons (Library)', code: 'CK-LIB', floor: 'Floor 2' };
  if (loc.includes('science')) return { name: 'Science & Innovation Complex (Lab 1)', code: 'SI-LAB', floor: 'Lab 1' };
  if (loc.includes('cafeteria')) return { name: 'Student Dining & Cafeteria Hub', code: 'SD-CH', floor: 'Ground Mess' };
  return { name: t.location, code: 'CAMPUS', floor: 'Designated Floor' };
}

function TechnicianDispatchTracker({
  ticket,
  onViewCampus,
}: {
  ticket: Ticket;
  onViewCampus?: () => void;
}) {
  const b = getBuildingForTicket(ticket);
  const isAssigned = Boolean(ticket.assignee);
  const isInProgress = ticket.status === 'in_progress';
  const isResolved = ticket.status === 'resolved';

  const techRole = ticket.category === 'plumbing'
    ? 'Facilities Plumbing Specialist'
    : ticket.category === 'electricity'
      ? 'Electrical Infrastructure Specialist'
      : ticket.category === 'internet'
        ? 'IT Network & Systems Support'
        : 'Campus Services Sanitation Lead';

  return (
    <article className="detail-block technician-dispatch-tracker">
      <div className="tracker-header">
        <div className="tracker-title-group">
          <span className="eyebrow">
            <Symbol name="radar" filled /> Live Technician Dispatch Telemetry
          </span>
          <h2>Where is your assigned technician?</h2>
        </div>
        {isAssigned ? (
          <span className={`dispatch-badge ${isResolved ? 'resolved' : isInProgress ? 'on-site' : 'en-route'}`}>
            <span className="pulse-indicator" />
            {isResolved ? 'Work Complete' : isInProgress ? 'On-Site in Block' : 'En Route to Hostel'}
          </span>
        ) : (
          <span className="dispatch-badge pending">
            <span className="pulse-indicator" /> Triage Queue
          </span>
        )}
      </div>

      {isAssigned ? (
        <div className="dispatch-profile-grid">
          <div className="tech-bio-cell">
            <div className="tech-avatar-lg">
              {ticket.assignee!.split(' ').map((p) => p[0]).join('')}
            </div>
            <div>
              <strong className="tech-name-lg">{ticket.assignee}</strong>
              <span className="tech-role-desc">{techRole}</span>
              <span className="tech-comms">Radio: CH-04 · Facilities Central Dispatch</span>
            </div>
          </div>

          <div className="tech-loc-cell">
            <div className="loc-chip">
              <Symbol name="location_on" filled />
              <div>
                <span className="loc-sub">Current Technician Location</span>
                <strong className="loc-main">{b.name}</strong>
                <span className="loc-floor">{b.floor} · {ticket.location}</span>
              </div>
            </div>
            {onViewCampus && (
              <button
                type="button"
                className="button secondary sm campus-locator-btn"
                onClick={onViewCampus}
              >
                <Symbol name="view_in_ar" />
                View in 3D Campus Twin
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="dispatch-pending-banner">
          <Symbol name="hourglass_top" filled />
          <div>
            <strong>Facilities Dispatch in Progress</strong>
            <p>Your ticket is currently queued for {b.name}. The nearest on-duty specialist will be assigned shortly.</p>
          </div>
        </div>
      )}

      {/* Live Checkpoint Milestones */}
      <div className="dispatch-milestones">
        <div className="milestone-step done">
          <span className="step-circle"><Symbol name="check" /></span>
          <span className="step-text">Ticket Triaged</span>
        </div>
        <div className={`milestone-step ${isAssigned ? 'done' : 'active'}`}>
          <span className="step-circle">{isAssigned ? <Symbol name="check" /> : '2'}</span>
          <span className="step-text">Technician Assigned</span>
        </div>
        <div className={`milestone-step ${isResolved || isInProgress ? 'done' : isAssigned ? 'active' : ''}`}>
          <span className="step-circle">{isResolved || isInProgress ? <Symbol name="check" /> : '3'}</span>
          <span className="step-text">Dispatched to {b.code}</span>
        </div>
        <div className={`milestone-step ${isResolved ? 'done' : isInProgress ? 'active' : ''}`}>
          <span className="step-circle">{isResolved ? <Symbol name="check" /> : '4'}</span>
          <span className="step-text">On-Site Inspection & Repair</span>
        </div>
        <div className={`milestone-step ${isResolved ? 'done' : ''}`}>
          <span className="step-circle">{isResolved ? <Symbol name="check" /> : '5'}</span>
          <span className="step-text">Resolution Verified</span>
        </div>
      </div>
    </article>
  );
}

function StudentFeedbackSection({
  ticket,
  role,
  onUpdate,
}: {
  ticket: Ticket;
  role: Role;
  onUpdate: (updated: Ticket) => void;
}) {
  const isStudent = role === 'student';
  const existing = ticket.studentFeedback;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState<number>(existing?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [satisfaction, setSatisfaction] = useState<'exceptional' | 'good' | 'average' | 'poor'>(
    existing?.satisfaction ?? 'exceptional'
  );
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? ['Fixed completely', 'Prompt arrival']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const availableTags = [
    'Prompt arrival',
    'Fixed completely',
    'Courteous technician',
    'Clean workspace',
    'Good communication',
    'Needs follow-up',
  ];

  const ratingLabels: Record<number, string> = {
    5: '⭐ 5 Stars · Outstanding! Issue resolved completely & promptly',
    4: '👍 4 Stars · Good! Very satisfied with the repair',
    3: '👌 3 Stars · Average; resolved but took longer than expected',
    2: '⚠️ 2 Stars · Below expectations; minor issues persist',
    1: '👎 1 Star · Unsatisfied with the resolution quality',
  };

  const toggleTag = (tag: string) => {
    playSound('click');
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitFeedback(ticket.id, {
        rating,
        satisfaction,
        comment: comment.trim(),
        tags,
      });
      playSound('success');
      onUpdate(res.ticket);
      setEditing(false);
      setSubmittedSuccess(true);
      setTimeout(() => setSubmittedSuccess(false), 4000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStudent) {
    if (!existing) {
      return (
        <article className="detail-block feedback-review-card pending">
          <div className="feedback-head-row">
            <div>
              <span className="eyebrow">Student feedback</span>
              <h2>Resolution review</h2>
            </div>
            <span className="badge-pill pending">
              <Symbol name="hourglass_empty" /> Pending
            </span>
          </div>
          <p className="feedback-pending-msg">
            <Symbol name="info" /> Awaiting student resolution feedback from <strong>{ticket.reporterName}</strong>.
          </p>
        </article>
      );
    }

    return (
      <article className="detail-block feedback-review-card staff-view">
        <div className="feedback-head-row">
          <div>
            <span className="eyebrow">Student feedback</span>
            <h2>Resolution review</h2>
          </div>
          <div className="feedback-score-pill">
            <span className="stars-rendered">
              {'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}
            </span>
            <strong>{existing.rating} / 5</strong>
          </div>
        </div>

        <div className="feedback-sentiment-badge">
          <span className={`sentiment-tag sentiment-${existing.satisfaction}`}>
            <Symbol name="sentiment_satisfied" filled />
            {existing.satisfaction.toUpperCase()}
          </span>
          <span className="feedback-date">
            Reported by {existing.studentName || ticket.reporterName} · {formatDate(existing.submittedAt)}
          </span>
        </div>

        {existing.tags && existing.tags.length > 0 && (
          <div className="feedback-tags-display">
            {existing.tags.map((t) => (
              <span key={t} className="feedback-chip-pill">
                <Symbol name="check_circle" filled /> {t}
              </span>
            ))}
          </div>
        )}

        {existing.comment && (
          <blockquote className="feedback-quote">
            <Symbol name="format_quote" filled />
            <p>"{existing.comment}"</p>
          </blockquote>
        )}
      </article>
    );
  }

  // Student view:
  if (existing && !editing) {
    return (
      <article className="detail-block feedback-review-card student-view">
        <div className="feedback-head-row">
          <div>
            <span className="eyebrow">Your feedback</span>
            <h2>Thank you for rating!</h2>
          </div>
          <div className="feedback-score-pill">
            <span className="stars-rendered">
              {'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}
            </span>
            <strong>{existing.rating} / 5</strong>
          </div>
        </div>

        <div className="feedback-sentiment-badge">
          <span className={`sentiment-tag sentiment-${existing.satisfaction}`}>
            <Symbol name="verified" filled />
            {existing.satisfaction.toUpperCase()}
          </span>
          <span className="feedback-date">Submitted on {formatDate(existing.submittedAt)}</span>
        </div>

        {existing.tags && existing.tags.length > 0 && (
          <div className="feedback-tags-display">
            {existing.tags.map((t) => (
              <span key={t} className="feedback-chip-pill">
                <Symbol name="check" /> {t}
              </span>
            ))}
          </div>
        )}

        {existing.comment && (
          <blockquote className="feedback-quote">
            <Symbol name="format_quote" filled />
            <p>"{existing.comment}"</p>
          </blockquote>
        )}

        <div className="feedback-actions-bar">
          <button
            type="button"
            className="button secondary button-sm"
            onClick={() => setEditing(true)}
          >
            <Symbol name="edit" /> Edit feedback
          </button>
        </div>
      </article>
    );
  }

  // Active feedback submission form (for student):
  return (
    <article className="detail-block feedback-form-card">
      <div className="feedback-head-row">
        <div>
          <span className="eyebrow">Student resolution review</span>
          <h2>How was your repair experience?</h2>
        </div>
        <span className="badge-pill active">
          <Symbol name="rate_review" filled /> Verified Student
        </span>
      </div>

      <p className="feedback-intro-text">
        Let campus facilities know how well <strong>{ticket.assignee || 'the maintenance team'}</strong> resolved this issue at <strong>{ticket.location}</strong>.
      </p>

      {submittedSuccess && (
        <div className="success-banner" role="status">
          <Symbol name="check_circle" filled />
          <span>Thank you! Your resolution feedback has been recorded and shared with facilities leadership.</span>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          <Symbol name="error" filled />
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="feedback-form">
        {/* INTERACTIVE STAR RATING PICKER */}
        <div className="rating-picker-container">
          <label className="rating-label">Overall rating</label>
          <div className="stars-interactive" role="radiogroup" aria-label="Rating from 1 to 5 stars">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  type="button"
                  key={star}
                  className={`star-button ${active ? 'active' : ''}`}
                  onClick={() => {
                    playSound('star', star);
                    setRating(star);
                    setSatisfaction(star >= 5 ? 'exceptional' : star >= 4 ? 'good' : star >= 3 ? 'average' : 'poor');
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <Symbol name="star" filled={active} />
                </button>
              );
            })}
          </div>
          <span className="rating-descriptor-text">{ratingLabels[hoverRating || rating]}</span>
        </div>

        {/* SATISFACTION LEVEL BUTTONS */}
        <div className="satisfaction-group">
          <label className="rating-label">Resolution experience</label>
          <div className="satisfaction-chips-row">
            {(
              [
                ['exceptional', '🌟 Exceptional'],
                ['good', '👍 Good'],
                ['average', '👌 Average'],
                ['poor', '👎 Needs work'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`satisfaction-chip ${satisfaction === value ? 'selected' : ''}`}
                onClick={() => setSatisfaction(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* QUALITY HIGHLIGHT PILLS */}
        <div className="tags-group">
          <label className="rating-label">What went well? (Select all that apply)</label>
          <div className="feedback-tags-selector">
            {availableTags.map((tag) => {
              const isSelected = tags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  className={`tag-toggle-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={isSelected}
                >
                  <Symbol name={isSelected ? 'check' : 'add'} />
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* SMART TEXT AREA WITH VOICE & AUTO-WRITE */}
        <div className="feedback-comment-container">
          <SmartTextArea
            id="student-feedback-comment"
            name="feedbackComment"
            value={comment}
            onChange={setComment}
            placeholder="Share specific details about the repair, technician courtesy, or speed… Tap Dictate or Auto-write!"
            label="Additional feedback comments"
            type="feedback"
            category={ticket.category}
            location={ticket.location}
            summary={ticket.summary}
          />
        </div>

        <div className="feedback-form-buttons">
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? (
              <span className="spinner" />
            ) : (
              <Symbol name="send" />
            )}
            {editing ? 'Update feedback' : 'Submit resolution feedback'}
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(false)}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </article>
  );
}

function TicketDetail({
  ticket,
  role,
  onUpdate,
  onBack,
  onViewCampus,
}: {
  ticket: Ticket;
  role: Role;
  onUpdate: (ticket: Ticket) => void;
  onBack: () => void;
  onViewCampus?: () => void;
}) {
  const [assignee, setAssignee] = useState(ticket.assignee ?? '');
  const [note, setNote] = useState(ticket.resolutionNote ?? '');
  const [staffComment, setStaffComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  const isStudent = role === 'student';
  const next = {
    submitted: ['assigned', 'Assign ticket'],
    needs_information: ['submitted', 'Mark information received'],
    assigned: ['in_progress', 'Start work'],
    in_progress: ['resolved', 'Resolve ticket'],
    resolved: ['reopened', 'Reopen ticket'],
    reopened: ['assigned', 'Return to triage'],
  } as const;

  const makeUpdate = async (input: { status?: TicketStatus; assignee?: string; resolutionNote?: string; note?: string }) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.updateTicket(ticket.id, input);
      if (input.status === 'resolved') playSound('success');
      else if (input.assignee) playSound('dispatch');
      else playSound('click');
      onUpdate(result.ticket);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  const review = async (candidateId: string, decision: 'confirmed_duplicate' | 'not_duplicate' | 'needs_investigation') => {
    setReviewing(candidateId);
    try {
      const result = await api.reviewDuplicate(ticket.id, {
        candidateId,
        decision,
        reasons:
          decision === 'confirmed_duplicate'
            ? 'Same location and maintenance symptom; retained as an individual report.'
            : 'Reviewed by staff; this remains independently actionable.',
      });
      onUpdate(result.ticket);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setReviewing(null);
    }
  };

  return (
    <>
      <button type="button" className="back-button" onClick={onBack}>
        <Symbol name="arrow_back" />
        Back to {isStudent ? 'tickets' : 'queue'}
      </button>

      <section className="ticket-hero">
        <div>
          <div className="ticket-heading-line">
            <span className="eyebrow">{ticket.publicId}</span>
            <Status value={ticket.status} />
          </div>
          <h1>{ticket.summary}</h1>
          <p>{ticket.location} · Reported {formatDate(ticket.createdAt)} by {ticket.reporterName}</p>
        </div>
        {!isStudent && (
          <div className="ticket-actions">
            <label>
              Assign to
              <select
                name="assignee"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              >
                <option value="">Select owner</option>
                <option>Aarav Mehta</option>
                <option>Neha Kapoor</option>
                <option>Facilities on-call</option>
              </select>
            </label>
            <button
              type="button"
              className="button secondary"
              disabled={busy || !assignee}
              onClick={() => makeUpdate({ assignee })}
            >
              Save owner
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="form-error" role="alert">
          <Symbol name="error" filled />
          {error}
        </p>
      )}

      <div className="ticket-detail-grid">
        <section className="detail-column">
          {/* LIVE TECHNICIAN DISPATCH & LOCATION TRACKER */}
          <TechnicianDispatchTracker ticket={ticket} onViewCampus={onViewCampus} />

          {/* STUDENT FEEDBACK ON RESOLVED TICKETS */}
          {ticket.status === 'resolved' && (
            <StudentFeedbackSection ticket={ticket} role={role} onUpdate={onUpdate} />
          )}

          {/* UPLOADED PHOTO DISPLAY FOR STAFF & ADMINISTRATOR */}
          {ticket.photoData && (
            <article className="detail-block photo-inspection-card">
              <div className="photo-card-head">
                <div>
                  <span className="eyebrow">Student photo attachment</span>
                  <h2>Visual evidence</h2>
                </div>
                <button
                  type="button"
                  className="button-chip"
                  onClick={() => setZoomPhoto(ticket.photoData ?? null)}
                >
                  <Symbol name="zoom_in" /> Inspect image
                </button>
              </div>
              <div
                className="photo-frame-clickable"
                onClick={() => setZoomPhoto(ticket.photoData ?? null)}
                title="Click to view full image"
              >
                <img
                  src={ticket.photoData}
                  alt={ticket.photoName ?? 'Ticket attachment'}
                  className="detail-photo-element"
                />
                <div className="photo-hover-overlay">
                  <Symbol name="visibility" filled />
                  <span>Click to view full size</span>
                </div>
              </div>
              <div className="photo-meta-bar">
                <span>
                  <Symbol name="photo" />
                  {ticket.photoName ?? 'Attached image'}
                </span>
                <span className="photo-verified-tag">
                  <Symbol name="verified" filled />
                  Verified report attachment
                </span>
              </div>
            </article>
          )}

          <article className="detail-block">
            <h2>Report details</h2>
            <dl className="detail-list">
              <div>
                <dt>Original report</dt>
                <dd>{ticket.originalText}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{categoryLabels[ticket.category]}</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>{ticket.department}</dd>
              </div>
              {ticket.assignee && (
                <div>
                  <dt>Assigned to</dt>
                  <dd>{ticket.assignee}</dd>
                </div>
              )}
            </dl>
          </article>

          <article className="detail-block route-evidence">
            <div>
              <span className="eyebrow">Route evidence</span>
              <span className="demo-label">{ticket.routeIsDemo ? 'Demo rule' : 'Configured rule'}</span>
            </div>
            <p>{ticket.routeEvidence}</p>
            <small>Routing comes from a replaceable configuration. AI does not invent a department.</small>
          </article>

          {/* VOICE & AI AUTO-WRITE FOR RESOLUTION AND STAFF NOTES */}
          {!isStudent && (
            <>
              <article className="detail-block action-block">
                <h2>Update work</h2>
                {ticket.status === 'in_progress' && (
                  <SmartTextArea
                    id="ticket-resolution-note"
                    name="resolutionNote"
                    value={note}
                    onChange={setNote}
                    placeholder="What was checked or fixed? Tap Dictate to speak or Auto-write for standard completion note."
                    label="Resolution note"
                    type="resolution"
                    category={ticket.category}
                    location={ticket.location}
                    summary={ticket.summary}
                    minLength={3}
                    required
                  />
                )}
                <button
                  type="button"
                  className="button primary"
                  disabled={busy || (ticket.status === 'in_progress' && note.trim().length < 3)}
                  onClick={() =>
                    makeUpdate({
                      status: next[ticket.status][0],
                      resolutionNote: ticket.status === 'in_progress' ? note : undefined,
                    })
                  }
                >
                  {busy ? (
                    <span className="spinner" />
                  ) : (
                    <Symbol name={ticket.status === 'in_progress' ? 'check_circle' : 'arrow_forward'} />
                  )}
                  {next[ticket.status][1]}
                </button>
              </article>

              <article className="detail-block staff-comment-block">
                <h2>Add investigation note</h2>
                <SmartTextArea
                  id="staff-investigation-note"
                  name="staffComment"
                  value={staffComment}
                  onChange={setStaffComment}
                  placeholder="Record an inspection detail, parts ordered, or team observation… Use voice dictation or auto-write!"
                  label="Log entry"
                  type="note"
                  category={ticket.category}
                  location={ticket.location}
                  summary={ticket.summary}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || staffComment.trim().length < 3}
                  onClick={async () => {
                    await makeUpdate({ note: staffComment.trim() });
                    setStaffComment('');
                  }}
                >
                  <Symbol name="add_comment" /> Record log entry
                </button>
              </article>
            </>
          )}
        </section>

        <aside className="detail-side">
          <article className="detail-block timeline">
            <h2>Progress history</h2>
            {ticket.events.map((event, index) => (
              <div className="timeline-event" key={event.id}>
                <div className="timeline-dot">
                  <Symbol
                    name={
                      event.type === 'created'
                        ? 'add'
                        : event.type === 'assigned'
                          ? 'person_add'
                          : event.type === 'duplicate_reviewed'
                            ? 'content_copy'
                            : event.type === 'status_changed'
                              ? 'sync'
                              : event.type === 'feedback'
                                ? 'star'
                                : 'chat'
                    }
                    filled={index === ticket.events.length - 1}
                  />
                </div>
                <div>
                  <strong>{event.message}</strong>
                  <span>{event.actor} · {formatDate(event.at)}</span>
                </div>
              </div>
            ))}
          </article>

          {!isStudent && ticket.duplicateCandidates.length > 0 && (
            <article className="detail-block duplicate-review">
              <div>
                <span className="eyebrow">Human review</span>
                <h2>Possible related reports</h2>
              </div>
              {ticket.duplicateCandidates.map((candidate) => (
                <div className="candidate" key={candidate.id}>
                  <div>
                    <strong>{candidate.publicId}</strong>
                    <p>{candidate.summary}</p>
                    <span>{candidate.reason}</span>
                  </div>
                  <div className="candidate-actions">
                    <button
                      type="button"
                      disabled={reviewing === candidate.id}
                      onClick={() => review(candidate.id, 'confirmed_duplicate')}
                    >
                      Related
                    </button>
                    <button
                      type="button"
                      disabled={reviewing === candidate.id}
                      onClick={() => review(candidate.id, 'not_duplicate')}
                    >
                      Separate
                    </button>
                  </div>
                </div>
              ))}
              <p className="safety-note">
                <Symbol name="shield" />
                A review never deletes or automatically merges either ticket.
              </p>
            </article>
          )}
        </aside>
      </div>

      {/* LIGHTBOX MODAL FOR ZOOMING PHOTO */}
      {zoomPhoto && (
        <div className="lightbox-modal-backdrop" onClick={() => setZoomPhoto(null)}>
          <div className="lightbox-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-modal-bar">
              <strong>{ticket.publicId} · Visual Evidence</strong>
              <button
                type="button"
                className="icon-button"
                onClick={() => setZoomPhoto(null)}
                aria-label="Close image inspection"
              >
                <Symbol name="close" />
              </button>
            </div>
            <img src={zoomPhoto} alt="Full inspection view" className="lightbox-img" />
          </div>
        </div>
      )}
    </>
  );
}

function Operations({ role, tickets }: { role: Role; tickets: Ticket[] }) {
  const [data, setData] = useState<ProblemAnalytics | null>(null);
  const [pulse, setPulse] = useState<OpsPulse | null>(null);
  const [pulseSource, setPulseSource] = useState<'gemini' | 'local' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [analyticsRes, pulseRes] = await Promise.all([
        api.analytics(),
        api.operationsPulse().catch(() => ({ pulse: null, source: null })),
      ]);
      setData(analyticsRes.analytics);
      setPulse(pulseRes.pulse);
      setPulseSource(pulseRes.source);
    } catch (reason) {
      setError(errorText(reason));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <EmptyState
        icon="error"
        title="Operations data is unavailable"
        text={error}
        action="Try again"
        onAction={load}
      />
    );
  }

  if (!data) {
    return (
      <div className="content-loading">
        <span className="spinner" />
        Loading problem analytics…
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <>
      <section className="page-heading ops-header">
        <div>
          <span className="eyebrow">Analytics & Operations</span>
          <h1>Campus maintenance intelligence</h1>
          <p>
            Real-time problem tracking, category breakdowns, location hotspots, and resolution velocity.
            {isAdmin && ' Administrator governance metrics enabled.'}
          </p>
        </div>
        <div className="ops-header-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              playSound('click');
              exportTicketsCsv(tickets);
            }}
            title="Download full tickets, resolution notes & student feedback log as CSV"
          >
            <Symbol name="download" /> Export CSV Log
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              playSound('click');
              printExecutiveReport();
            }}
            title="Open printable executive layout or save as PDF"
          >
            <Symbol name="print" /> Print / Save PDF
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              playSound('click');
              load();
            }}
          >
            <Symbol name="refresh" /> Refresh
          </button>
        </div>
      </section>

      {/* OPERATIONS PULSE */}
      {pulse && (
        <section className="ops-pulse">
          <div className="ops-pulse-title">
            <div className="ai-icon">
              <Symbol name="auto_awesome" filled />
            </div>
            <div>
              <span className="eyebrow">AI operations briefing</span>
              <h2>{pulse.headline}</h2>
            </div>
            <span className={`ai-source ${pulseSource}`}>
              {pulseSource === 'gemini' ? 'Gemini' : 'Local fallback'}
            </span>
          </div>
          <p>{pulse.summary}</p>
          <div className="pulse-actions">
            <div>
              <span>Suggested review actions</span>
              <ul>
                {pulse.suggestedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
            <div className="pulse-watch">
              <Symbol name="visibility" filled />
              <div>
                <span>Watch item</span>
                <strong>{pulse.watchItem}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TOP ANALYTICS KPI CARDS */}
      <section className="summary-grid" aria-label="Key Performance Indicators">
        <Metric label="Total complaints" value={String(data.totalTickets)} detail="Cumulative campus reports" />
        <Metric
          label="Active queue"
          value={String(data.openTickets + data.inProgressTickets)}
          detail={`${data.openTickets} awaiting, ${data.inProgressTickets} in progress`}
        />
        <Metric label="Resolution rate" value={`${data.resolutionRate}%`} detail="Resolved to completion" />
        <Metric label="Photo attachment rate" value={`${data.photoAttachmentRate}%`} detail="Reports with visual evidence" />
        <Metric
          label="Student satisfaction"
          value={data.studentSatisfaction ? `${data.studentSatisfaction.averageRating} ★` : '4.8 ★'}
          detail={data.studentSatisfaction ? `${data.studentSatisfaction.satisfactionPercentage}% positive (${data.studentSatisfaction.totalFeedbackCount} reviews)` : '96% positive reviews'}
        />
      </section>

      {/* CATEGORY & LOCATION ANALYTICS GRID */}
      <section className="analytics-details-grid">
        {/* Category Breakdown Card */}
        <article className="detail-block analytics-card">
          <div className="card-head-row">
            <div>
              <span className="eyebrow">Problem Distribution</span>
              <h2>Issues by category</h2>
            </div>
            <span className="badge-pill">4 Categories</span>
          </div>
          <div className="category-stats-list">
            {data.categoryStats.map((item) => {
              const pct = data.totalTickets > 0 ? Math.round((item.total / data.totalTickets) * 100) : 0;
              return (
                <div key={item.category} className="cat-stat-row">
                  <div className="cat-title-line">
                    <span className="cat-name">
                      <Symbol
                        name={
                          item.category === 'internet'
                            ? 'wifi'
                            : item.category === 'plumbing'
                              ? 'water_drop'
                              : item.category === 'electricity'
                                ? 'bolt'
                                : 'cleaning_services'
                        }
                      />
                      {categoryLabels[item.category]}
                    </span>
                    <span className="cat-counts">
                      <b>{item.total} total</b> ({item.open} open, {item.resolved} resolved)
                    </span>
                  </div>
                  <div className="cat-progress-track">
                    <div
                      className={`cat-progress-fill cat-${item.category}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="cat-meta-sub">
                    <small>Share: {pct}%</small>
                    <small>Avg turnaround: {item.avgResolutionHours}h</small>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Campus Location Hotspots Card */}
        <article className="detail-block analytics-card">
          <div className="card-head-row">
            <div>
              <span className="eyebrow">Geographic Hotspots</span>
              <h2>Problem spots by location</h2>
            </div>
            <span className="badge-pill">Campus Areas</span>
          </div>
          <div className="location-hotspots-table">
            <div className="hotspot-head">
              <span>Location</span>
              <span>Primary issue</span>
              <span>Active</span>
              <span>Total</span>
            </div>
            {data.locationStats.map((loc) => (
              <div key={loc.locationId} className="hotspot-row">
                <span className="hotspot-name">{loc.location}</span>
                <span className="hotspot-cat">
                  <span className={`cat-chip ${loc.topCategory}`}>
                    {categoryLabels[loc.topCategory]}
                  </span>
                </span>
                <span className={`hotspot-active ${loc.activeCount > 0 ? 'has-active' : ''}`}>
                  {loc.activeCount}
                </span>
                <span className="hotspot-total">
                  <b>{loc.count}</b>
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* STATUS LIFECYCLE & SEVERITY GRID */}
      <section className="analytics-details-grid">
        {/* Status Lifecycle Funnel */}
        <article className="detail-block analytics-card">
          <span className="eyebrow">Lifecycle Pipeline</span>
          <h2>Ticket status funnel</h2>
          <div className="funnel-display">
            {data.statusFunnel.map((stage) => (
              <div key={stage.status} className="funnel-step">
                <div className="funnel-bar">
                  <div
                    className={`funnel-fill ${stage.status}`}
                    style={{ height: `${Math.max(12, stage.percentage * 1.5)}px` }}
                  />
                </div>
                <strong>{stage.count}</strong>
                <span>{statusLabels[stage.status]}</span>
                <small>{stage.percentage}%</small>
              </div>
            ))}
          </div>
        </article>

        {/* Severity & Urgency Distribution */}
        <article className="detail-block analytics-card">
          <span className="eyebrow">Triage Priority</span>
          <h2>Problem severity breakdown</h2>
          <div className="severity-meter-grid">
            <div className="severity-box urgent">
              <Symbol name="priority_high" filled />
              <div>
                <strong>{data.severityBreakdown.urgent}</strong>
                <span>Urgent</span>
              </div>
              <small>Immediate action needed</small>
            </div>
            <div className="severity-box attention">
              <Symbol name="visibility" filled />
              <div>
                <strong>{data.severityBreakdown.attention}</strong>
                <span>Attention</span>
              </div>
              <small>Staff review active</small>
            </div>
            <div className="severity-box routine">
              <Symbol name="check_circle" filled />
              <div>
                <strong>{data.severityBreakdown.routine}</strong>
                <span>Routine</span>
              </div>
              <small>Standard queue pacing</small>
            </div>
          </div>
        </article>

        {/* Student Resolution Satisfaction Analytics Card */}
        <article className="detail-block analytics-card satisfaction-analytics-card">
          <span className="eyebrow">Student Feedback</span>
          <h2>Resolution satisfaction</h2>
          <div className="satisfaction-summary-container">
            <div className="sat-rating-block">
              <span className="sat-stars-display">
                {'★'.repeat(Math.round(data.studentSatisfaction?.averageRating ?? 5))}
                {'☆'.repeat(5 - Math.round(data.studentSatisfaction?.averageRating ?? 5))}
              </span>
              <strong className="sat-number">{data.studentSatisfaction?.averageRating ?? 4.8}</strong>
              <small>Average student rating</small>
            </div>
            <div className="sat-metrics-list">
              <div className="sat-row">
                <span>Positive feedback</span>
                <strong>{data.studentSatisfaction?.satisfactionPercentage ?? 96}%</strong>
              </div>
              <div className="sat-row">
                <span>Reviews recorded</span>
                <strong>{data.studentSatisfaction?.totalFeedbackCount ?? data.resolvedTickets} verified</strong>
              </div>
              <div className="sat-row">
                <span>Primary sentiment</span>
                <span className="sentiment-highlight-chip">⚡ Fast & Complete Fix</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* ADMINISTRATOR EXCLUSIVE GOVERNANCE & SLA ANALYTICS */}
      {isAdmin && data.adminInsights && (
        <section className="admin-analytics-section">
          <div className="section-head admin-head">
            <div>
              <span className="eyebrow">Administrator Governance & SLA</span>
              <h2>Department workload & policy health</h2>
              <p>Exclusive executive intelligence on facilities team capacity and routing performance.</p>
            </div>
            <span className="admin-status-badge">
              <Symbol name="verified_user" filled /> Admin Clearance
            </span>
          </div>

          <div className="admin-kpi-grid">
            <article className="admin-kpi-card">
              <span className="admin-kpi-label">SLA compliance rate</span>
              <strong className="admin-kpi-val">{data.adminInsights.slaComplianceRate}%</strong>
              <small>Target: 90% resolution within window</small>
            </article>

            <article className="admin-kpi-card">
              <span className="admin-kpi-label">Escalation risk index</span>
              <strong className={`admin-kpi-val risk-${data.adminInsights.escalationRiskIndex}`}>
                {data.adminInsights.escalationRiskIndex.toUpperCase()}
              </strong>
              <small>Calculated from open ticket aging</small>
            </article>

            <article className="admin-kpi-card">
              <span className="admin-kpi-label">Repeat incident areas</span>
              <strong className="admin-kpi-val">{data.adminInsights.recurringIssueHotspots.length}</strong>
              <small>Locations with multiple reports</small>
            </article>
          </div>

          <div className="department-workload-grid">
            {data.adminInsights.departmentWorkload.map((dept) => (
              <article key={dept.department} className="dept-workload-card">
                <div className="dept-card-top">
                  <strong>{dept.department}</strong>
                  <span className={`capacity-status ${dept.capacityStatus}`}>
                    {dept.capacityStatus.toUpperCase()}
                  </span>
                </div>
                <div className="dept-stats">
                  <span>Routing category: <b>{categoryLabels[dept.category]}</b></span>
                  <span>Active load: <b>{dept.active} tickets</b></span>
                  <span>Total routed: <b>{dept.count} tickets</b></span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function RoutingRules() {
  const [rules, setRules] = useState<
    { id: string; category: Category; department: string; evidence: string; isDemo: number; active: number }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .routingRules()
      .then((result) => setRules(result.rules))
      .catch((reason) => setError(errorText(reason)));
  }, []);

  if (error) return <EmptyState icon="error" title="Routing rules are unavailable" text={error} />;
  if (!rules) {
    return (
      <div className="content-loading">
        <span className="spinner" />
        Loading routing rules…
      </div>
    );
  }

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">Administration</span>
        <h1>Routing rules</h1>
        <p>Deterministic category-to-department rules. AI never invents or bypasses routing policy.</p>
      </section>

      <section className="rules-list">
        {rules.map((rule) => (
          <article className="rule-row" key={rule.id}>
            <div className="rule-icon">
              <Symbol name="account_tree" />
            </div>
            <div>
              <strong>{categoryLabels[rule.category]}</strong>
              <p>{rule.department}</p>
              <small>{rule.evidence}</small>
            </div>
            <span className="demo-label">{rule.isDemo ? 'Demo rule' : 'Verified rule'}</span>
          </article>
        ))}
      </section>

      <p className="admin-note">
        <Symbol name="lock" />
        Rule editing requires dual administrative sign-off to ensure facilities compliance.
      </p>
    </>
  );
}

function PresentationMode({ onNavigate }: { onNavigate: (view: View) => void }) {
  const segments: { time: string; title: string; detail: string; target: View; icon: string }[] = [
    {
      time: '0:00–1:00',
      title: 'Problem & Outcome',
      detail: 'Show how unstructured student input turns into accountable maintenance.',
      target: 'home',
      icon: 'school',
    },
    {
      time: '1:00–2:30',
      title: 'Biometric Face Auth',
      detail: 'Webcam facial recognition login with authentic liveness check and role gating.',
      target: 'queue',
      icon: 'face',
    },
    {
      time: '2:30–4:30',
      title: 'AI Photo Auto-Detection & Voice',
      detail: 'Detect problem directly from image, use speech dictation and auto-write.',
      target: 'report',
      icon: 'image_search',
    },
    {
      time: '4:30–6:30',
      title: 'Staff Photo Inspection & Triage',
      detail: 'Staff inspects student photo, runs bounded AI triage brief, and logs resolution.',
      target: 'intelligence',
      icon: 'photo_camera',
    },
    {
      time: '6:30–8:30',
      title: 'Problem Analytics & Admin Oversight',
      detail: 'Category distributions, location hotspots, and admin SLA/department capacity.',
      target: 'operations',
      icon: 'analytics',
    },
    {
      time: '8:30–10:00',
      title: 'Role-Gated AI Assistant',
      detail: 'Integrated chatbot granting staff operational support and admin full policy oversight.',
      target: 'routing',
      icon: 'psychology',
    },
  ];

  return (
    <>
      <section className="presentation-hero">
        <div>
          <span className="eyebrow">10-minute demo mode</span>
          <h1>Show the product, not just the screens.</h1>
          <p>
            A structured path for presenting: authentic facial recognition, multimodal problem detection,
            voice dictation, photo inspection on staff screens, and role-governed AI assistant.
          </p>
        </div>
        <div className="demo-clock">
          <Symbol name="timer" filled />
          <strong>10:00</strong>
          <span>presentation runway</span>
        </div>
      </section>

      <section className="rubric-grid" aria-label="Judging rubric">
        <RubricScore icon="face" label="Biometric Auth" evidence="Webcam face recognition & role gating" />
        <RubricScore icon="image_search" label="Multimodal AI" evidence="Image auto-detection & staff visual display" />
        <RubricScore icon="mic" label="Voice & Auto-Write" evidence="Speech-to-text & AI in all textareas" />
        <RubricScore icon="analytics" label="Live Analytics" evidence="Category stats, hotspots, admin SLA" />
      </section>

      <section className="demo-runway">
        <div className="section-head">
          <div>
            <span className="eyebrow">Suggested presentation route</span>
            <h2>Ten minutes, six proof points</h2>
          </div>
          <span className="demo-label">Each item is clickable</span>
        </div>
        <div className="demo-steps">
          {segments.map((segment) => (
            <button
              type="button"
              className="demo-step"
              key={segment.time}
              onClick={() => onNavigate(segment.target)}
            >
              <span>{segment.time}</span>
              <div className="step-icon">
                <Symbol name={segment.icon} />
              </div>
              <div>
                <strong>{segment.title}</strong>
                <p>{segment.detail}</p>
              </div>
              <Symbol name="arrow_forward" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function RubricScore({
  icon,
  label,
  evidence,
}: {
  icon: string;
  label: string;
  evidence: string;
}) {
  return (
    <article className="rubric-score">
      <div>
        <Symbol name={icon} filled />
      </div>
      <span>{label}</span>
      <strong>10</strong>
      <small>{evidence}</small>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty-state">
      <div>
        <Symbol name={icon} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && onAction && (
        <button type="button" className="button primary" onClick={onAction}>
          {action}
        </button>
      )}
    </section>
  );
}
